import "./style.css";

// --- Router ---
type PageFn = (params: Record<string, string>) => string | HTMLElement;

const routes: Record<string, PageFn> = {};

function hash() {
  const h = location.hash.replace(/^#\/?/, "");
  const parts = h.split("/");
  const name = parts[0] || "landing";
  const params: Record<string, string> = {};
  if (parts[1]) params.id = parts[1];
  if (parts[1] && parts[0] === "s") params.token = parts[1];
  return { name, params };
}

function navigate(href: string) {
  history.pushState(null, "", href);
  render();
}

// --- Icons ---
const ICONS: Record<string, string> = {
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16"/><path d="M4 6h16"/><path d="M4 18h16"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
  "trash-2": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  "chevron-down": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>',
  "chevron-right": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>',
  "file-text": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
};

function icon(name: string, size = 16) {
  return `<span class="lucide" style="width:${size}px;height:${size}px">${ICONS[name] || ""}</span>`;
}

function html(str: TemplateStringsArray, ...vals: any[]) {
  return String.raw(str, ...vals);
}

function esc(s: unknown) {
  return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function mdHtml(t: string) {
  return esc(t)
    .replace(/^### (.+)$/gm, "<h3>$1</h3>").replace(/^## (.+)$/gm, "<h2>$1</h2>").replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^- (.+)$/gm, "<li>$1</li>").replace(/\n\n/g, "</p><p>").replace(/^([^<].*)$/gm, m => m.startsWith("<") ? m : `<p>${m}</p>`);
}

function themeToggle() {
  const isLight = document.documentElement.className === "light";
  document.documentElement.className = isLight ? "" : "light";
  localStorage.setItem("notes-theme", isLight ? "dark" : "light");
}

// --- Pages ---

routes["landing"] = () => html`
<div class="landing-wrap">
  <h1>Notes</h1>
  <p>Open-source Markdown. Write, share, attach files on S3.</p>
  <div class="landing-actions">
    <a class="primary" href="#/login">Sign in</a>
    <a class="secondary" href="#/app">Open app</a>
  </div>
</div>`;

routes["login"] = () => html`
<div class="auth-wrap">
  <div class="auth-card">
    <h1>Sign in</h1>
    <p class="sub">Session cookie. Invite-only accounts for now.</p>
    <form id="lf">
      <label><span>Email</span><input name="email" type="email" required autocomplete="username" value="paulo@local"></label>
      <label><span>Password</span><input name="password" type="password" required autocomplete="current-password"></label>
      <p id="lerr" class="sub" style="color:var(--danger);display:none" role="alert"></p>
      <button type="submit">Continue</button>
    </form>
  </div>
</div>`;

routes["app"] = async () => {
  const u = await me();
  if (!u) { navigate("#/login"); return ""; }
  const notes = await listNotes();
  const flds = await folders();
  const groups = new Map<string, typeof notes>();
  for (const n of notes) {
    const f = n.folder || "(no folder)";
    if (!groups.has(f)) groups.set(f, []);
    groups.get(f)!.push(n);
  }
  let sidebarItems = "";
  for (const [folder, items] of groups) {
    sidebarItems += `<div class="folder-header" data-expanded="1"><span class="lucide">${ICONS["chevron-down"]}</span>${esc(folder)} <span style="margin-left:auto;color:var(--muted);font-weight:400">${items.length}</span></div><div>`;
    for (const n of items) {
      const v = n.visibility.toLowerCase();
      sidebarItems += `<a class="nav-item" data-id="${n.id}"><span class="lucide">${ICONS["file-text"]}</span><span style="flex:1">${esc(n.title)}</span>${n.visibility !== "PRIVATE" ? `<span class="badge ${v}">${esc(n.visibility)}</span>` : ""}</a>`;
    }
    sidebarItems += "</div>";
  }

  return html`
<div class="app-layout">
  <div class="sidebar-overlay" id="overlay"></div>
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-head">
      <button class="ghost mobile-hide" id="sb-close">${icon("x")}</button>
      <h1>Notes</h1>
      <button class="ghost" id="theme-btn">${icon("moon")}</button>
      <button id="new-btn">${icon("plus")}</button>
    </div>
    <div class="sidebar-search">${icon("search", 14)}<input id="sq" type="search" placeholder="Search"></div>
    <nav class="sidebar-nav">${sidebarItems}</nav>
  </aside>
  <main class="main-area">
    <div class="empty-state" id="main-empty">
      <button class="ghost mobile-only" id="sb-open">${icon("menu", 20)}</button>
      <h2>Select a note</h2>
      <p>Pick one from the sidebar or create a new one.</p>
      <button class="primary" id="empty-new">${icon("plus")} New note</button>
    </div>
  </main>
</div>`;
};

routes["note"] = async (params) => {
  const { id } = params;
  return html`
<div class="app-layout">
  <main class="main-area">
    <div class="editor-top">
      <button class="ghost" id="n-back">${icon("menu")}</button>
      <span class="status" id="n-status">Loading…</span>
      <button class="ghost" id="n-folder" style="font-size:.8125rem;color:var(--muted)">${icon("folder")} <span id="n-folder-label">none</span></button>
      <button id="n-share">${icon("share")}</button>
      <button id="n-export">${icon("download")}</button>
      <button class="primary" id="n-save">Save</button>
      <button class="danger" id="n-del">${icon("trash-2")}</button>
    </div>
    <div class="editor-scroll">
      <input id="n-title" class="title-field" placeholder="Note title">
      <div class="editor-split">
        <div class="editor-pane"><textarea id="n-body" placeholder="Write in Markdown…"></textarea></div>
        <div class="preview-pane" id="n-preview"></div>
      </div>
    </div>
  </main>
</div>`;
};

routes["s"] = async (params) => {
  const token = params.token || "";
  try {
    const note = await getShared(token);
    if (!note) return '<div class="share-wrap"><h1>Link unavailable</h1><p style="color:var(--muted)">This share link is invalid or was revoked.</p></div>';
    return html`<div class="share-wrap"><p class="label">Shared note</p><h1>${esc(note.title)}</h1><article class="share-body">${note.html}</article></div>`;
  } catch {
    return '<div class="share-wrap"><h1>Error</h1><p style="color:var(--muted)">Could not load.</p></div>';
  }
};

// --- Render ---
async function render() {
  const { name, params } = hash();
  const root = document.getElementById("app")!;
  const fn = routes[name];
  if (!fn) { navigate("#/app"); return; }
  const result = await fn(params);
  root.innerHTML = result;
  afterRender(name, params);
}

function afterRender(name: string, params: Record<string, string>) {
  const isMobile = window.innerWidth <= 800;
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");

  function openSidebar() { sidebar?.classList.add("open"); overlay?.classList.add("open"); }
  function closeSidebar() { sidebar?.classList.remove("open"); overlay?.classList.remove("open"); }
  overlay?.addEventListener("click", closeSidebar);
  document.getElementById("sb-close")?.addEventListener("click", closeSidebar);
  document.getElementById("sb-open")?.addEventListener("click", openSidebar);

  if (isMobile && name === "app") {
    // auto-open sidebar on mobile
    openSidebar();
  }

  // Theme toggle
  document.getElementById("theme-btn")?.addEventListener("click", themeToggle);

  if (name === "login") {
    const form = document.getElementById("lf") as HTMLFormElement;
    const err = document.getElementById("lerr")!;
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      err.style.display = "none";
      const fd = new FormData(form);
      const btn = form.querySelector("button")!;
      btn.disabled = true; btn.textContent = "…";
      try {
        const res = await login(String(fd.get("email")), String(fd.get("password")));
        if (!res.ok) { err.textContent = "Wrong email or password."; err.style.display = ""; btn.disabled = false; btn.textContent = "Continue"; return; }
        navigate("#/app");
      } catch { err.textContent = "Server error."; err.style.display = ""; btn.disabled = false; btn.textContent = "Continue"; }
    });
  }

  if (name === "app") {
    // Folder collapse/expand
    document.querySelectorAll(".folder-header").forEach(h => {
      h.addEventListener("click", () => {
        const next = h.nextElementSibling as HTMLElement | null;
        if (!next) return;
        const exp = h.getAttribute("data-expanded") === "1";
        h.setAttribute("data-expanded", exp ? "0" : "1");
        next.style.display = exp ? "none" : "";
        const icon = h.querySelector(".lucide");
        if (icon) icon.innerHTML = ICONS[exp ? "chevron-right" : "chevron-down"]!;
      });
    });

    // Note click
    document.querySelectorAll(".nav-item[data-id]").forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        closeSidebar();
        navigate(`#/note/${el.getAttribute("data-id")}`);
      });
    });

    // New note
    const newBtn = document.getElementById("new-btn");
    const emptyNew = document.getElementById("empty-new");
    async function doNew() {
      const t = prompt("Title", "Untitled");
      if (!t?.trim()) return;
      const note = await createNote(t.trim());
      if (note) navigate(`#/note/${note.id}`);
    }
    newBtn?.addEventListener("click", doNew);
    emptyNew?.addEventListener("click", doNew);

    // Search
    const sq = document.getElementById("sq") as HTMLInputElement;
    let timer: number;
    sq?.addEventListener("input", () => {
      clearTimeout(timer);
      timer = window.setTimeout(async () => {
        const notes = await listNotes(sq.value.trim());
        // Re-render sidebar with filtered results
        const nav = document.querySelector(".sidebar-nav");
        if (!nav) return;
        const groups = new Map<string, typeof notes>();
        for (const n of notes) {
          const f = n.folder || "(no folder)";
          if (!groups.has(f)) groups.set(f, []);
          groups.get(f)!.push(n);
        }
        nav.innerHTML = "";
        for (const [folder, items] of groups) {
          nav.innerHTML += `<div class="folder-header" data-expanded="1"><span class="lucide">${ICONS["chevron-down"]}</span>${esc(folder)} <span style="margin-left:auto;color:var(--muted);font-weight:400">${items.length}</span></div><div>`;
          for (const n of items) {
            nav.innerHTML += `<a class="nav-item" data-id="${n.id}"><span class="lucide">${ICONS["file-text"]}</span><span style="flex:1">${esc(n.title)}</span>${n.visibility !== "PRIVATE" ? `<span class="badge">${esc(n.visibility)}</span>` : ""}</a>`;
          }
          nav.innerHTML += "</div>";
        }
        // Re-bind events after re-render
        nav.querySelectorAll(".folder-header").forEach(h => {
          h.addEventListener("click", () => {
            const next = h.nextElementSibling as HTMLElement | null;
            if (!next) return;
            const exp = h.getAttribute("data-expanded") === "1";
            h.setAttribute("data-expanded", exp ? "0" : "1");
            next.style.display = exp ? "none" : "";
            const icon = h.querySelector(".lucide");
            if (icon) icon.innerHTML = ICONS[exp ? "chevron-right" : "chevron-down"]!;
          });
        });
        nav.querySelectorAll(".nav-item[data-id]").forEach(el => {
          el.addEventListener("click", (e) => {
            e.preventDefault();
            closeSidebar();
            navigate(`#/note/${el.getAttribute("data-id")}`);
          });
        });
      }, 150);
    });
  }

  if (name === "note") {
    const id = params.id!;
    let note: any = null;
    let dirty = false;
    const titleEl = document.getElementById("n-title") as HTMLInputElement;
    const bodyEl = document.getElementById("n-body") as HTMLTextAreaElement;
    const preview = document.getElementById("n-preview")!;
    const status = document.getElementById("n-status")!;

    function setStatus(t: string, k?: string) { status.textContent = t; status.className = "status" + (k ? ` ${k}` : ""); }

    function renderPreview() {
      preview.innerHTML = bodyEl.value.trim() ? mdHtml(bodyEl.value) : '<span style="color:var(--muted)">Preview</span>';
    }

    async function loadNote() {
      const u = await me();
      if (!u) { navigate("#/login"); return; }
      const n = await getNote(id);
      if (!n) { setStatus("Not found", "err"); return; }
      note = n;
      titleEl.value = n.title;
      bodyEl.value = n.body;
      document.getElementById("n-folder-label")!.textContent = n.folder || "none";
      dirty = false;
      setStatus(n.visibility + (n.shareToken ? ` · s/${n.shareToken}` : ""));
      renderPreview();
    }

    document.getElementById("n-back")?.addEventListener("click", () => navigate("#/app"));
    document.getElementById("n-save")?.addEventListener("click", async () => {
      setStatus("Saving…");
      await updateNote(id, { title: titleEl.value, body: bodyEl.value });
      dirty = false;
      setStatus("Saved", "ok");
    });
    document.getElementById("n-del")?.addEventListener("click", async () => {
      if (!confirm("Delete permanently?")) return;
      await deleteNote(id);
      navigate("#/app");
    });
    document.getElementById("n-export")?.addEventListener("click", () => {
      window.open(`/api/notes/${id}/export`, "_blank");
    });
    document.getElementById("n-folder")?.addEventListener("click", async () => {
      const f = prompt("Folder name", note?.folder || "");
      if (f === null) return;
      const v = f.trim() || null;
      await updateNote(id, { folder: v });
      document.getElementById("n-folder-label")!.textContent = v || "none";
    });
    document.getElementById("n-share")?.addEventListener("click", async () => {
      const mode = prompt("Visibility: PRIVATE / LINK / PUBLIC", note?.visibility || "LINK");
      if (!mode) return;
      const expiresIn = mode === "LINK" ? parseInt(prompt("Expire in seconds (blank = never)", "") || "0", 10) : 0;
      note = await shareNote(id, mode.toUpperCase(), expiresIn);
      setStatus(note.visibility + (note.shareToken ? ` · s/${note.shareToken}` : ""), "ok");
      if (note.shareToken) {
        const url = `${location.origin}${location.pathname}#/s/${note.shareToken}`;
        await navigator.clipboard.writeText(url).catch(() => {});
        alert(`Link copied:\n${url}`);
      }
    });
    titleEl?.addEventListener("input", () => { if (!dirty) { dirty = true; setStatus("Unsaved"); } });
    bodyEl?.addEventListener("input", () => { if (!dirty) { dirty = true; setStatus("Unsaved"); } renderPreview(); });
    window.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); document.getElementById("n-save")?.click(); }
    });
    loadNote();
  }
}

window.addEventListener("hashchange", render);
window.addEventListener("popstate", render);
render();
export interface Note {
  id: string; title: string; slug: string; folder: string | null;
  visibility: string; shareToken: string | null; shareExpiresAt: string | null;
  body: string; createdAt: string; updatedAt: string;
  attachments: { id: string; filename: string; key: string }[];
}

let cookie = "";

export async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(path, {
    credentials: "include",
    ...opts,
    headers: { ...opts.headers, "content-type": opts.headers?.["content-type"] as string || "application/json" },
  });
  if (path === "/api/auth/login") {
    const c = res.headers.getSetCookie?.()?.[0];
    if (c) cookie = c.split(";")[0];
  }
  return res;
}

export async function login(email: string, password: string) {
  return api("/api/auth/login", {
    method: "POST", body: JSON.stringify({ email, password }),
  });
}

export async function logout() {
  return api("/api/auth/logout", { method: "POST" });
}

export async function me() {
  const res = await api("/api/auth/me");
  if (!res.ok) return null;
  return (await res.json()).user as { id: string; email: string; name: string; role: string } | null;
}

export async function listNotes(q = "") {
  const url = q ? `/api/notes?q=${encodeURIComponent(q)}` : "/api/notes";
  const res = await api(url);
  if (!res.ok) throw new Error("unauthorized");
  return (await res.json()).notes as Note[];
}

export async function folders() {
  const res = await api("/api/folders");
  if (!res.ok) return [];
  const d = await res.json();
  return d.folders as { name: string; count: number }[];
}

export async function getNote(id: string) {
  const res = await api(`/api/notes/${id}`);
  if (!res.ok) return null;
  return (await res.json()).note as Note;
}

export async function createNote(title: string, folder?: string) {
  const res = await api("/api/notes", {
    method: "POST", body: JSON.stringify({ title, body: "", folder: folder || null }),
  });
  return (await res.json()).note as Note;
}

export async function updateNote(id: string, data: { title?: string; body?: string; folder?: string | null }) {
  await api(`/api/notes/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteNote(id: string) {
  await api(`/api/notes/${id}`, { method: "DELETE" });
}

export async function shareNote(id: string, visibility: string, expiresIn = 0) {
  const body: any = { visibility };
  if (expiresIn > 0) body.expiresIn = expiresIn;
  const res = await api(`/api/notes/${id}/share`, { method: "POST", body: JSON.stringify(body) });
  return (await res.json()).note as Note;
}

export async function getShared(token: string) {
  const res = await api(`/api/s/${token}`);
  if (!res.ok) return null;
  return (await res.json()).note as Note & { html: string };
}

export async function uploadAttachment(noteId: string, file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await api(`/api/notes/${noteId}/attachments`, { method: "POST", body: fd });
  return res.ok;
}

export async function attachmentUrl(id: string) {
  const res = await api(`/api/attachments/${id}/url`);
  if (!res.ok) return null;
  const d = await res.json();
  return d.url as string;
}
