import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import { Elysia, t } from "elysia";
import { readFileSync } from "fs";
import { join } from "path";
import { marked } from "marked";
import {
  clearSessionCookie,
  createSession,
  destroySession,
  getUserFromToken,
  hashPassword,
  readSessionCookie,
  sessionCookie,
  verifyPassword,
} from "./auth";
import { db } from "./db";
import { shareToken, slugify } from "./notes";
import { deleteObject, ensureBucket, presignGet, putObject } from "./s3";

const port = Number(process.env.PORT ?? 3102);
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:4321";
const isProd = process.env.NODE_ENV === "production";
const webDist = isProd ? join(import.meta.dir!, "../../web/dist") : undefined;

const fallbacks = new Map<string, string>();
if (isProd && webDist) {
  try {
    const html = readFileSync(join(webDist, "index.html"), "utf-8");
    fallbacks.set("/", html);
    console.log(`serving SPA from ${webDist}`);
  } catch {
    console.warn("web/dist not found — API only");
  }
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL ?? "paulo@local";
  const password = process.env.ADMIN_PASSWORD ?? "changeme";
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return;
  await db.user.create({
    data: {
      email,
      name: "Paulo",
      passwordHash: hashPassword(password),
      role: "ADMIN",
    },
  });
  console.log(`seeded admin ${email}`);
}

const app = new Elysia()
  .use(
    cors({
      origin: webOrigin,
      credentials: true,
    }),
  )
  .use(
    isProd && webDist
      ? staticPlugin({ prefix: "/", assets: webDist, noCache: true })
      : (a: Elysia) => a,
  )
  .derive(async ({ request }) => {
    const token = readSessionCookie(request.headers.get("cookie"));
    const user = await getUserFromToken(token);
    return { user, sessionToken: token };
  })
  .get("/api/health", () => ({ ok: true }))
  .post(
    "/api/auth/login",
    async ({ body, set }) => {
      const user = await db.user.findUnique({ where: { email: body.email } });
      if (!user || !verifyPassword(body.password, user.passwordHash)) {
        set.status = 401;
        return { error: "invalid credentials" };
      }
      const session = await createSession(user.id);
      set.headers["set-cookie"] = sessionCookie(session.token, session.expiresAt);
      return {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      };
    },
    {
      body: t.Object({
        email: t.String({ minLength: 1 }),
        password: t.String({ minLength: 1 }),
      }),
    },
  )
  .post("/api/auth/logout", async ({ sessionToken, set }) => {
    await destroySession(sessionToken);
    set.headers["set-cookie"] = clearSessionCookie();
    return { ok: true };
  })
  .post(
    "/api/auth/register",
    async ({ body, set }) => {
      const existing = await db.user.findUnique({ where: { email: body.email } });
      if (existing) { set.status = 409; return { error: "email already registered" }; }
      const user = await db.user.create({
        data: {
          email: body.email,
          name: body.name || body.email.split("@")[0],
          passwordHash: hashPassword(body.password),
          role: "USER",
        },
      });
      const session = await createSession(user.id);
      set.headers["set-cookie"] = sessionCookie(session.token, session.expiresAt);
      return {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      };
    },
    {
      body: t.Object({
        email: t.String({ minLength: 1 }),
        password: t.String({ minLength: 6 }),
        name: t.Optional(t.String()),
      }),
    },
  )
  .get("/api/auth/me", ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }
    return { user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  })
  .get("/api/notes", async ({ user, set, query }) => {
    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }
    const q = query.q?.trim();
    const notes = await db.note.findMany({
      where: {
        ownerId: user.id,
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { body: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        folder: true,
        visibility: true,
        shareToken: true,
        shareExpiresAt: true,
        maxViews: true,
        viewCount: true,
        tags: true,
        updatedAt: true,
        createdAt: true,
      },
    });
    return { notes };
  })
  .post(
    "/api/notes",
    async ({ user, set, body }) => {
      if (!user) {
        set.status = 401;
        return { error: "unauthorized" };
      }
      const base = slugify(body.title);
      let slug = base;
      let i = 1;
      while (await db.note.findUnique({ where: { ownerId_slug: { ownerId: user.id, slug } } })) {
        slug = `${base}-${i++}`;
      }
      const note = await db.note.create({
        data: {
          ownerId: user.id,
          title: body.title,
          slug,
          body: body.body ?? "",
          folder: body.folder ?? null,
          tags: body.tags ?? [],
        },
      });
      return { note };
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1, maxLength: 200 }),
        body: t.Optional(t.String({ maxLength: 1_000_000 })),
        folder: t.Optional(t.String({ maxLength: 100 })),
        tags: t.Optional(t.Array(t.String({ maxLength: 50 }))),
      }),
    },
  )
  .get("/api/folders", async ({ user, set }) => {
    if (!user) { set.status = 401; return { error: "unauthorized" }; }
    const rows = await db.note.groupBy({
      by: ["folder"],
      where: { ownerId: user.id, folder: { not: null } },
      _count: { id: true },
    });
    return { folders: rows.map(r => ({ name: r.folder, count: r._count.id })) };
  })
  .get("/api/tags", async ({ user, set }) => {
    if (!user) { set.status = 401; return { error: "unauthorized" }; }
    const notes = await db.note.findMany({ where: { ownerId: user.id }, select: { tags: true } });
    const count = new Map<string, number>();
    for (const n of notes) for (const t of n.tags) count.set(t, (count.get(t) || 0) + 1);
    return { tags: [...count.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count) };
  })
  .get("/api/notes/:id", async ({ user, set, params }) => {
    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }
    const note = await db.note.findFirst({
      where: { id: params.id, ownerId: user.id },
      include: { attachments: true, shares: { include: { user: { select: { id: true, email: true, name: true, avatar: true } } } } },
    });
    if (!note) {
      set.status = 404;
      return { error: "not found" };
    }
    return { note };
  })
  .get("/api/notes/:id/backlinks", async ({ user, set, params }) => {
    if (!user) { set.status = 401; return { error: "unauthorized" }; }
    const current = await db.note.findUnique({ where: { id: params.id }, select: { title: true, ownerId: true } });
    if (!current || current.ownerId !== user.id) { set.status = 404; return { error: "not found" }; }
    const all = await db.note.findMany({ where: { ownerId: user.id }, select: { id: true, title: true } });
    const titleWords = current.title.toLowerCase().split(/\s+/).filter(Boolean);
    const linked: { id: string; title: string }[] = [];
    for (const n of all) {
      if (n.id === params.id) continue;
      const body = await db.note.findUnique({ where: { id: n.id }, select: { body: true } });
      if (body?.body && titleWords.some(w => body.body.toLowerCase().includes(w))) linked.push(n);
    }
    return { backlinks: linked };
  })
  .patch(
    "/api/notes/:id",
    async ({ user, set, params, body }) => {
      if (!user) {
        set.status = 401;
        return { error: "unauthorized" };
      }
      const existing = await db.note.findFirst({ where: { id: params.id, ownerId: user.id } });
      if (!existing) {
        set.status = 404;
        return { error: "not found" };
      }
      const note = await db.note.update({
        where: { id: existing.id },
        data: {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.body !== undefined ? { body: body.body } : {}),
          ...(body.folder !== undefined ? { folder: body.folder } : {}),
          ...(body.tags !== undefined ? { tags: body.tags } : {}),
        },
      });
      return { note };
    },
    {
      body: t.Object({
        title: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
        body: t.Optional(t.String({ maxLength: 1_000_000 })),
        folder: t.Optional(t.String({ maxLength: 100 })),
        tags: t.Optional(t.Array(t.String({ maxLength: 50 }))),
      }),
    },
  )
  .delete("/api/notes/:id", async ({ user, set, params }) => {
    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }
    const existing = await db.note.findFirst({
      where: { id: params.id, ownerId: user.id },
      include: { attachments: true },
    });
    if (!existing) {
      set.status = 404;
      return { error: "not found" };
    }
    for (const a of existing.attachments) {
      await deleteObject(a.key).catch(() => {});
    }
    await db.note.delete({ where: { id: existing.id } });
    return { ok: true };
  })
  .post(
    "/api/notes/:id/share",
    async ({ user, set, params, body }) => {
      if (!user) { set.status = 401; return { error: "unauthorized" }; }
      const existing = await db.note.findFirst({ where: { id: params.id, ownerId: user.id } });
      if (!existing) { set.status = 404; return { error: "not found" }; }
      const visibility = body.visibility;
      const shareExpiresAt = body.expiresIn ? new Date(Date.now() + body.expiresIn * 1000) : null;
      const note = await db.note.update({
        where: { id: existing.id },
        data: {
          visibility,
          shareToken: visibility === "PRIVATE" ? null : existing.shareToken ?? shareToken(),
          shareExpiresAt,
          sharePassword: body.password ?? null,
          maxViews: body.maxViews ?? null,
          viewCount: visibility === "PRIVATE" ? 0 : existing.viewCount,
        },
      });
      return { note };
    },
    {
      body: t.Object({
        visibility: t.Union([t.Literal("PRIVATE"), t.Literal("LINK"), t.Literal("PUBLIC")]),
        expiresIn: t.Optional(t.Number()),
        password: t.Optional(t.String()),
        maxViews: t.Optional(t.Number()),
      }),
    },
  )
  .post("/api/notes/:id/revoke", async ({ user, set, params }) => {
    if (!user) { set.status = 401; return { error: "unauthorized" }; }
    const note = await db.note.updateMany({
      where: { id: params.id, ownerId: user.id },
      data: { shareToken: null, visibility: "PRIVATE", sharePassword: null, shareExpiresAt: null, maxViews: null, viewCount: 0 },
    });
    return { ok: true };
  })
  .get("/api/notes/:id/export", async ({ user, set, params, query }) => {
    if (!user) { set.status = 401; return { error: "unauthorized" }; }
    const note = await db.note.findFirst({
      where: { id: params.id, ownerId: user.id },
    });
    if (!note) { set.status = 404; return { error: "not found" }; }
    const format = query.format || "md";
    if (format === "html") {
      const html = await marked.parse(note.body, { async: true });
      const doc = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>${note.title}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{max-width:720px;margin:0 auto;padding:2rem 1.5rem;font-family:system-ui,sans-serif;line-height:1.7;color:#1c1e26}img{max-width:100%}pre{background:#f0f1f4;padding:.75rem;border-radius:8px;overflow:auto}</style></head><body><h1>${note.title}</h1>${html}</body></html>`;
      set.headers["content-type"] = "text/html; charset=utf-8";
      set.headers["cache-control"] = "no-cache, no-store, must-revalidate";
      set.headers["content-disposition"] = `attachment; filename="${note.slug}.html"`;
      return doc;
    }
    const filename = `${note.slug}.md`;
    set.headers["content-type"] = "text/markdown; charset=utf-8";
    set.headers["content-disposition"] = `attachment; filename="${filename}"`;
    return `# ${note.title}\n\n${note.body}`;
  })
  .get("/api/s/:token", async ({ params, set, query }) => {
    const note = await db.note.findFirst({
      where: {
        shareToken: params.token,
        visibility: { in: ["LINK", "PUBLIC"] },
      },
      select: {
        id: true,
        title: true,
        body: true,
        updatedAt: true,
        visibility: true,
        shareExpiresAt: true,
        sharePassword: true,
        maxViews: true,
        viewCount: true,
      },
    });
    if (!note) { set.status = 404; return { error: "not found" }; }
    if (note.shareExpiresAt && note.shareExpiresAt < new Date()) { set.status = 410; return { error: "link expired" }; }
    if (note.maxViews && note.viewCount >= note.maxViews) { set.status = 410; return { error: "max views reached" }; }

    // Password check
    const pw = query.password as string | undefined;
    if (note.sharePassword && pw !== note.sharePassword) {
      if (pw !== undefined) { set.status = 403; return { error: "wrong password" }; }
      return { needPassword: true };
    }

    // Increment view count
    await db.note.update({ where: { id: note.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

    return {
      note: {
        id: note.id, title: note.title, body: note.body, updatedAt: note.updatedAt,
        visibility: note.visibility, shareExpiresAt: note.shareExpiresAt,
        html: await marked.parse(note.body, { async: true }),
      },
    };
  })
  .post("/api/notes/:id/attachments", async ({ user, set, params, request }) => {
    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }
    const note = await db.note.findFirst({ where: { id: params.id, ownerId: user.id } });
    if (!note) {
      set.status = 404;
      return { error: "not found" };
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      set.status = 400;
      return { error: "file required" };
    }
    if (file.size > 10 * 1024 * 1024) {
      set.status = 400;
      return { error: "max 10MB" };
    }
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const key = `notes/${note.id}/${crypto.randomUUID()}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    await putObject(key, buf, file.type || "application/octet-stream");
    const attachment = await db.attachment.create({
      data: {
        noteId: note.id,
        key,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
      },
    });
    const url = await presignGet(key);
    return { attachment, url };
  })
  .get("/api/attachments/:id/url", async ({ user, set, params }) => {
    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }
    const attachment = await db.attachment.findUnique({
      where: { id: params.id },
      include: { note: true },
    });
    if (!attachment || attachment.note.ownerId !== user.id) {
      set.status = 404;
      return { error: "not found" };
    }
    return { url: await presignGet(attachment.key) };
  })
  .get("/api/users/search", async ({ user, set, query }) => {
    if (!user) { set.status = 401; return { error: "unauthorized" }; }
    const q = query.q?.trim() || "";
    if (q.length < 2) return { users: [] };
    const users = await db.user.findMany({
      where: { id: { not: user.id }, OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] },
      select: { id: true, email: true, name: true, avatar: true },
      take: 20,
    });
    return { users };
  })
  .get("/api/notes/:id/shares", async ({ user, set, params }) => {
    if (!user) { set.status = 401; return { error: "unauthorized" }; }
    const note = await db.note.findFirst({ where: { id: params.id, ownerId: user.id } });
    if (!note) { set.status = 404; return { error: "not found" }; }
    const shares = await db.noteShare.findMany({
      where: { noteId: note.id },
      include: { user: { select: { id: true, email: true, name: true, avatar: true } } },
    });
    return { shares: shares.map(s => ({ id: s.id, permission: s.permission, createdAt: s.createdAt, user: s.user })) };
  })
  .post(
    "/api/notes/:id/shares",
    async ({ user, set, params, body }) => {
      if (!user) { set.status = 401; return { error: "unauthorized" }; }
      const note = await db.note.findFirst({ where: { id: params.id, ownerId: user.id } });
      if (!note) { set.status = 404; return { error: "not found" }; }
      const targets = await db.user.findMany({ where: { id: { in: body.userIds }, id: { not: user.id } } });
      for (const target of targets) {
        await db.noteShare.upsert({
          where: { noteId_userId: { noteId: note.id, userId: target.id } },
          create: { noteId: note.id, userId: target.id, permission: body.permission || "READ" },
          update: { permission: body.permission || "READ" },
        });
      }
      return { ok: true };
    },
    { body: t.Object({ userIds: t.Array(t.String()), permission: t.Optional(t.String()) }) },
  )
  .delete("/api/notes/:id/shares/:userId", async ({ user, set, params }) => {
    if (!user) { set.status = 401; return { error: "unauthorized" }; }
    const note = await db.note.findFirst({ where: { id: params.id, ownerId: user.id } });
    if (!note) { set.status = 404; return { error: "not found" }; }
    await db.noteShare.deleteMany({ where: { noteId: note.id, userId: params.userId } });
    return { ok: true };
  })
  .get("/api/auth/profile", async ({ user, set }) => {
    if (!user) { set.status = 401; return { error: "unauthorized" }; }
    const full = await db.user.findUnique({ where: { id: user.id } });
    if (!full) { set.status = 404; return { error: "not found" }; }
    let avatarUrl: string | null = null;
    if (full.avatar) try { avatarUrl = await presignGet(full.avatar); } catch {}
    return { profile: { id: full.id, email: full.email, name: full.name, role: full.role, bio: full.bio, avatar: avatarUrl } };
  })
  .patch(
    "/api/auth/profile",
    async ({ user, set, body }) => {
      if (!user) { set.status = 401; return { error: "unauthorized" }; }
      const updated = await db.user.update({
        where: { id: user.id },
        data: { ...(body.name !== undefined ? { name: body.name } : {}), ...(body.bio !== undefined ? { bio: body.bio } : {}) },
      });
      return { profile: { id: updated.id, email: updated.email, name: updated.name, role: updated.role, bio: updated.bio } };
    },
    { body: t.Object({ name: t.Optional(t.String()), bio: t.Optional(t.String()) }) },
  )
  .post("/api/auth/profile/photo", async ({ user, set, request }) => {
    if (!user) { set.status = 401; return { error: "unauthorized" }; }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) { set.status = 400; return { error: "file required" }; }
    if (file.size > 5 * 1024 * 1024) { set.status = 400; return { error: "max 5MB" }; }
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "png";
    const key = `avatars/${user.id}/${crypto.randomUUID()}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    await putObject(key, buf, file.type || "image/png");
    await db.user.update({ where: { id: user.id }, data: { avatar: key } });
    const url = await presignGet(key);
    return { avatar: url };
  })
  .get("/api/admin/users", async ({ user, set }) => {
    if (!user || user.role !== "ADMIN") { set.status = 403; return { error: "forbidden" }; }
    const users = await db.user.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, email: true, name: true, role: true, bio: true, avatar: true, createdAt: true, _count: { select: { notes: true } } } });
    return { users: users.map(u => ({ ...u, noteCount: u._count.notes, _count: undefined })) };
  })
  .patch(
    "/api/admin/users/:id",
    async ({ user, set, params, body }) => {
      if (!user || user.role !== "ADMIN") { set.status = 403; return { error: "forbidden" }; }
      const data: Record<string, string> = {};
      if (body.password) data.passwordHash = hashPassword(body.password);
      if (body.name) data.name = body.name;
      if (body.role) data.role = body.role;
      const updated = await db.user.update({ where: { id: params.id }, data, select: { id: true, email: true, name: true, role: true } });
      return { user: updated };
    },
    { body: t.Object({ name: t.Optional(t.String()), password: t.Optional(t.String()), role: t.Optional(t.String()) }) },
  )
  .delete("/api/admin/users/:id", async ({ user, set, params }) => {
    if (!user || user.role !== "ADMIN") { set.status = 403; return { error: "forbidden" }; }
    if (params.id === user.id) { set.status = 400; return { error: "cannot delete yourself" }; }
    await db.user.delete({ where: { id: params.id } });
    return { ok: true };
  })
  .get("/s/:token", async ({ params, set, query }) => {
    const note = await db.note.findFirst({
      where: { shareToken: params.token, visibility: { in: ["LINK", "PUBLIC"] } },
      select: { id: true, title: true, body: true, updatedAt: true, visibility: true, shareExpiresAt: true, sharePassword: true, maxViews: true, viewCount: true },
    });
    if (!note) {
      set.headers["content-type"] = "text/html; charset=utf-8";
      set.headers["cache-control"] = "no-cache, no-store, must-revalidate";
      return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not Found - Notes</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0e0f14;color:#dadce0}div{text-align:center}h1{font-size:1.5rem;margin:0 0 .5rem}p{color:#9aa0a8}</style></head><body><div><h1>Note not found</h1><p>This link may be invalid or the note has been removed.</p></div></body></html>`;
    }
    if (note.shareExpiresAt && note.shareExpiresAt < new Date()) {
      set.headers["content-type"] = "text/html; charset=utf-8";
      set.headers["cache-control"] = "no-cache, no-store, must-revalidate";
      return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Expired - Notes</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0e0f14;color:#dadce0}div{text-align:center}h1{font-size:1.5rem;margin:0 0 .5rem}p{color:#9aa0a8}</style></head><body><div><h1>Link expired</h1><p>This share link has expired.</p></div></body></html>`;
    }
    const pw = query.password as string | undefined;
    if (note.sharePassword && pw !== note.sharePassword) {
      set.headers["content-type"] = "text/html; charset=utf-8";
      set.headers["cache-control"] = "no-cache, no-store, must-revalidate";
      if (pw !== undefined) {
        return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wrong Password - Notes</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0e0f14;color:#dadce0}.card{background:#1c1e24;padding:2rem;border-radius:8px;text-align:center}h1{font-size:1.5rem;margin:0 0 1rem;margin-top:0}input{padding:.5rem;border-radius:4px;border:1px solid #2a2d35;background:#0e0f14;color:#dadce0;width:100%;margin-bottom:.75rem}button{background:#d08770;color:#0e0f14;border:none;padding:.5rem 1.5rem;border-radius:4px;cursor:pointer}</style></head><body><div class="card"><h1>Incorrect password</h1><p style="color:#9aa0a8;margin-bottom:1rem">Wrong password. Try again.</p><form method="GET"><input type="password" name="password" placeholder="Enter password" /><button type="submit">Retry</button></form></div></body></html>`;
      }
      const pwForm = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Password Required - Notes</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0e0f14;color:#dadce0}.card{background:#1c1e24;padding:2rem;border-radius:8px;text-align:center}h1{font-size:1.5rem;margin:0 0 1rem;margin-top:0}input{padding:.5rem;border-radius:4px;border:1px solid #2a2d35;background:#0e0f14;color:#dadce0;width:100%;margin-bottom:.75rem}button{background:#d08770;color:#0e0f14;border:none;padding:.5rem 1.5rem;border-radius:4px;cursor:pointer}</style></head><body><div class="card"><h1>Password required</h1><p style="color:#9aa0a8;margin-bottom:1rem">This note is password-protected.</p><form method="GET"><input type="password" name="password" placeholder="Enter password" /><button type="submit">View</button></form></div></body></html>`;
      return pwForm;
    }
    await db.note.update({ where: { id: note.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
    const rendered = await marked.parse(note.body, { async: true });
    set.headers["content-type"] = "text/html; charset=utf-8";
      set.headers["cache-control"] = "no-cache, no-store, must-revalidate";
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${note.title} - Notes</title><style>body{max-width:720px;margin:0 auto;padding:2rem 1.5rem;font-family:system-ui,sans-serif;line-height:1.7;color:#dadce0;background:#0e0f14}img{max-width:100%;border-radius:4px}pre{background:#1c1e24;padding:.75rem;border-radius:6px;overflow-x:auto}code{font-size:.9em}blockquote{border-left:3px solid #d08770;padding-left:.75rem;margin-left:0;opacity:.8}h1,h2,h3{line-height:1.2;letter-spacing:-.02em}a{color:#d08770}.meta{color:#636b78;font-size:.8rem;margin-bottom:1.5rem}h1{margin-top:0}</style></head><body><h1>${note.title}</h1><div class="meta">${new Date(note.updatedAt).toLocaleDateString()} · Shared via Notes</div>${rendered}</body></html>`;
  })
  .onStart(async () => {
    await seedAdmin();
    try {
      await ensureBucket();
      console.log("s3 bucket ready");
    } catch (e) {
      console.warn("s3 unavailable (attachments disabled until MinIO is up):", e);
    }
  })
  // SPA fallback: serve index.html for all non-API GET routes
  .all("/*", ({ request, set }) => {
    if (request.method !== "GET" || request.url.includes("/api/")) {
      set.status = 404;
      return { error: "not found" };
    }
    const html = fallbacks.get("/");
    if (html) {
      set.headers["content-type"] = "text/html; charset=utf-8";
      set.headers["cache-control"] = "no-cache, no-store, must-revalidate";
      return html;
    }
    set.status = 404;
    return { error: "not found" };
  })
  .listen(port);

console.log(`notes api http://localhost:${port}`);

export type App = typeof app;
