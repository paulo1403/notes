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
      ? staticPlugin({ prefix: "/", assets: webDist, noCache: false })
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
        },
      });
      return { note };
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1, maxLength: 200 }),
        body: t.Optional(t.String({ maxLength: 1_000_000 })),
        folder: t.Optional(t.String({ maxLength: 100 })),
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
  .get("/api/notes/:id", async ({ user, set, params }) => {
    if (!user) {
      set.status = 401;
      return { error: "unauthorized" };
    }
    const note = await db.note.findFirst({
      where: { id: params.id, ownerId: user.id },
      include: { attachments: true },
    });
    if (!note) {
      set.status = 404;
      return { error: "not found" };
    }
    return { note };
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
        },
      });
      return { note };
    },
    {
      body: t.Object({
        title: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
        body: t.Optional(t.String({ maxLength: 1_000_000 })),
        folder: t.Optional(t.String({ maxLength: 100 })),
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
      if (!user) {
        set.status = 401;
        return { error: "unauthorized" };
      }
      const existing = await db.note.findFirst({ where: { id: params.id, ownerId: user.id } });
      if (!existing) {
        set.status = 404;
        return { error: "not found" };
      }
      const visibility = body.visibility;
      const shareExpiresAt = body.expiresIn ? new Date(Date.now() + body.expiresIn * 1000) : null;
      const note = await db.note.update({
        where: { id: existing.id },
        data: {
          visibility,
          shareToken:
            visibility === "PRIVATE"
              ? null
              : existing.shareToken ?? shareToken(),
          shareExpiresAt,
        },
      });
      return { note };
    },
    {
      body: t.Object({
        visibility: t.Union([t.Literal("PRIVATE"), t.Literal("LINK"), t.Literal("PUBLIC")]),
        expiresIn: t.Optional(t.Number()),
      }),
    },
  )
  .get("/api/notes/:id/export", async ({ user, set, params }) => {
    if (!user) { set.status = 401; return { error: "unauthorized" }; }
    const note = await db.note.findFirst({
      where: { id: params.id, ownerId: user.id },
    });
    if (!note) { set.status = 404; return { error: "not found" }; }
    const filename = `${note.slug}.md`;
    set.headers["content-type"] = "text/markdown; charset=utf-8";
    set.headers["content-disposition"] = `attachment; filename="${filename}"`;
    return `# ${note.title}\n\n${note.body}`;
  })
  .get("/api/s/:token", async ({ params, set }) => {
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
      },
    });
    if (!note) {
      set.status = 404;
      return { error: "not found" };
    }
    if (note.shareExpiresAt && note.shareExpiresAt < new Date()) {
      set.status = 410;
      return { error: "link expired" };
    }
    return {
      note: {
        ...note,
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
      return html;
    }
    set.status = 404;
    return { error: "not found" };
  })
  .listen(port);

console.log(`notes api http://localhost:${port}`);

export type App = typeof app;
