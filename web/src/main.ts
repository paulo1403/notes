import "./style.css";

// --- Helpers ---
const ICONS: Record<string, string> = {
  folder:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
  moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
  sun:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
  menu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16"/><path d="M4 6h16"/><path d="M4 18h16"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  share:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>',
  download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
  "trash-2":'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  "chevron-down":'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>',
  "chevron-right":'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>',
  "file-text":'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
};

function icon(name: string, size = 16) { return `<span class="lucide" style="width:${size}px;height:${size}px">${ICONS[name]||""}</span>`; }
function esc(s: unknown) { return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]); }
function mdHtml(t: string) {
  return esc(t)
    .replace(/^### (.+)$/gm,"<h3>$1</h3>").replace(/^## (.+)$/gm,"<h2>$1</h2>").replace(/^# (.+)$/gm,"<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\*(.+?)\*/g,"<em>$1</em>").replace(/`([^`]+)`/g,"<code>$1</code>")
    .replace(/^- (.+)$/gm,"<li>$1</li>").replace(/\n\n/g,"</p><p>").replace(/^([^<].*)$/gm,m=>m.startsWith("<")?m:`<p>${m}</p>`);
}

// --- Modal ---
let modalResolve: ((v: string|null)=>void)|null = null;

function modal(html: string): Promise<string|null> {
  return new Promise(resolve => {
    modalResolve = resolve;
    document.getElementById("modal-content")!.innerHTML = html;
    document.getElementById("modal")!.classList.add("open");
  });
}

document.addEventListener("click", e => {
  const t = (e.target as HTMLElement);
  if (t.closest("#modal-cancel")) { document.getElementById("modal")!.classList.remove("open"); modalResolve?.(null); }
  if (t.closest("#modal-ok")) {
    const val = (document.getElementById("modal-input") as HTMLInputElement)?.value;
    document.getElementById("modal")!.classList.remove("open");
    modalResolve?.(val ?? "");
  }
});

function showModal(title: string, opts?: { input?: string; placeholder?: string; okText?: string }): Promise<string|null> {
  return modal(`
    <div class="modal-card">
      <h3>${esc(title)}</h3>
      ${opts?.input !== undefined ? `<input id="modal-input" value="${esc(opts.input)}" placeholder="${esc(opts.placeholder||"")}" autofocus>` : ""}
      <div class="modal-actions">
        <button id="modal-cancel" class="ghost">Cancel</button>
        <button id="modal-ok" class="primary">${esc(opts?.okText||"OK")}</button>
      </div>
    </div>`);
}

function showConfirm(title: string): Promise<boolean> {
  return modal(`<div class="modal-card"><h3>${esc(title)}</h3><div class="modal-actions"><button id="modal-cancel" class="ghost">Cancel</button><button id="modal-ok" class="danger">Delete</button></div></div>`)
    .then(v => v !== null);
}

function showAlert(msg: string): Promise<void> {
  return modal(`<div class="modal-card"><p style="margin:0 0 1rem;color:var(--ink-soft)">${esc(msg)}</p><div class="modal-actions"><button id="modal-ok" class="primary">OK</button></div></div>`)
    .then(() => {});
}

// --- API ---
let currentNoteId: string|null = null;
let noteData: any = null;
let dirty = false;
let searchQuery = "";
let allNotes: any[] = [];
let foldersList: {name:string;count:number}[] = [];
let currentFolder = "";

async function api(path: string, opts: RequestInit = {}) {
  const headers: Record<string,string> = { ...opts.headers as any };
  if (!headers["content-type"] && !(opts.body instanceof FormData)) headers["content-type"] = "application/json";
  return fetch(path, { credentials: "include", ...opts, headers });
}

async function login(email: string, password: string) {
  return api("/api/auth/login", { method:"POST", body:JSON.stringify({email,password}) });
}

async function loadData() {
  const u = await (await api("/api/auth/me")).json();
  if (u.error) return false;
  const nr = await api(searchQuery ? `/api/notes?q=${encodeURIComponent(searchQuery)}` : "/api/notes");
  allNotes = (await nr.json()).notes || [];
  const fr = await api("/api/folders");
  foldersList = (await fr.json()).folders || [];
  return true;
}

async function createNote(title: string, folder?: string) {
  const r = await api("/api/notes", { method:"POST", body:JSON.stringify({title,body:"",folder:folder||null}) });
  return (await r.json()).note;
}

async function getNote(id: string) {
  const r = await api(`/api/notes/${id}`);
  if (!r.ok) return null;
  return (await r.json()).note;
}

async function updateNote(id: string, data: any) {
  await api(`/api/notes/${id}`, { method:"PATCH", body:JSON.stringify(data) });
}

async function deleteNote(id: string) {
  await api(`/api/notes/${id}`, { method:"DELETE" });
}

async function shareNote(id: string, visibility: string, expiresIn = 0) {
  const b: any = { visibility };
  if (expiresIn > 0) b.expiresIn = expiresIn;
  const r = await api(`/api/notes/${id}/share`, { method:"POST", body:JSON.stringify(b) });
  return (await r.json()).note;
}

async function uploadAttach(id: string, file: File) {
  const fd = new FormData(); fd.append("file", file);
  return api(`/api/notes/${id}/attachments`, { method:"POST", body:fd });
}

async function attachUrl(id: string) {
  const r = await api(`/api/attachments/${id}/url`);
  return r.ok ? (await r.json()).url : null;
}

// --- Render ---
const $ = (s: string) => document.querySelector(s);
const $$ = (s: string) => document.querySelectorAll(s);

function bind(sel: string, ev: string, fn: (e: Event)=>void) {
  $(sel)?.addEventListener(ev, fn);
}

function renderSidebar() {
  const nav = document.getElementById("sidebar-nav")!;
  const q = searchQuery;
  const notes = allNotes.filter(n => !q || n.title.toLowerCase().includes(q) || (n.body||"").toLowerCase().includes(q));

  const groups = new Map<string, typeof notes>();
  for (const n of notes) {
    const f = n.folder || "(no folder)";
    if (!groups.has(f)) groups.set(f, []);
    groups.get(f)!.push(n);
  }

  nav.innerHTML = "";
  for (const [folder, items] of groups) {
    const h = document.createElement("div");
    h.className = "folder-header";
    h.innerHTML = `${icon("chevron-down")}${esc(folder)} <span style="margin-left:auto;color:var(--muted);font-weight:400">${items.length}</span>`;
    h.dataset.expanded = "1";
    h.addEventListener("click", () => {
      const next = h.nextElementSibling as HTMLElement|null;
      if (!next) return;
      const exp = h.dataset.expanded === "1";
      h.dataset.expanded = exp ? "0" : "1";
      next.style.display = exp ? "none" : "";
      const ic = h.querySelector(".lucide");
      if (ic) ic.innerHTML = ICONS[exp ? "chevron-right" : "chevron-down"]!;
    });
    nav.appendChild(h);
    const c = document.createElement("div");
    for (const n of items) {
      const a = document.createElement("a");
      a.className = "nav-item" + (n.id === currentNoteId ? " active" : "");
      a.innerHTML = `${icon("file-text")}<span style="flex:1">${esc(n.title)}</span>${n.visibility!=="PRIVATE"?`<span class="badge">${esc(n.visibility)}</span>`:""}`;
      a.addEventListener("click", (e) => { e.preventDefault(); openNote(n.id); });
      c.appendChild(a);
    }
    nav.appendChild(c);
  }
  if (!notes.length) nav.innerHTML = '<div style="padding:1rem 0.75rem;color:var(--muted);font-size:0.8125rem">No notes.</div>';
}

async function openNote(id: string) {
  const note = await getNote(id);
  if (!note) return showAlert("Note not found");
  currentNoteId = id;
  noteData = note;
  dirty = false;
  renderSidebar();
  renderEditor();
  closeSidebar();
}

function renderEditor() {
  const main = document.getElementById("main-area")!;
  if (!currentNoteId || !noteData) {
    main.innerHTML = `
      <div class="empty-state">
        <button class="ghost mobile-only" id="sb-open">${icon("menu",20)}</button>
        <h2>Select a note</h2>
        <p>Pick one from the sidebar or create a new one.</p>
        <button class="primary" id="empty-new">${icon("plus")} New note</button>
      </div>`;
    bind("#empty-new", "click", () => doNew());
    return;
  }

  const n = noteData;
  let attachHtml = "";
  if (n.attachments?.length) {
    for (const a of n.attachments) {
      attachHtml += `<div class="attach-row"><span class="grow">${esc(a.filename)}</span><button class="attach-open" data-id="${a.id}">Open</button></div>`;
    }
  } else {
    attachHtml = '<span style="color:var(--muted);font-size:0.8125rem">No attachments.</span>';
  }

  main.innerHTML = `
    <div class="editor-top">
      <button class="ghost mobile-only" id="sb-open">${icon("menu")}</button>
      <span class="status" id="n-status">${esc(n.visibility)}${n.shareToken?` · s/${n.shareToken}`:""}</span>
      <button class="ghost" id="n-folder" style="font-size:.8125rem;color:var(--muted)">${icon("folder")} <span id="n-folder-label">${esc(n.folder||"none")}</span></button>
      <button id="n-share">${icon("share")}</button>
      <button id="n-export">${icon("download")}</button>
      <button class="primary" id="n-save">Save</button>
      <button class="danger" id="n-del">${icon("trash-2")}</button>
    </div>
    <div class="editor-scroll">
      <input id="n-title" class="title-field" value="${esc(n.title)}" placeholder="Note title">
      <div class="editor-split">
        <div class="editor-pane"><textarea id="n-body" placeholder="Write in Markdown…">${esc(n.body)}</textarea></div>
        <div class="preview-pane" id="n-preview"></div>
      </div>
      <section class="attach-area">
        <div class="attach-head"><strong>Attachments</strong><input type="file" id="n-file" style="flex:1;font-size:.8125rem"><button id="n-upload">Upload</button></div>
        <div id="n-files">${attachHtml}</div>
      </section>
    </div>`;

  renderPreview();
  bind("#sb-open", "click", () => openSidebar());

  // Attach open handlers
  $$(".attach-open").forEach(el => {
    el.addEventListener("click", async () => {
      const id = (el as HTMLElement).dataset.id!;
      const url = await attachUrl(id);
      if (url) window.open(url, "_blank", "noopener");
    });
  });

  bind("#n-upload", "click", async () => {
    const file = ($("#n-file") as HTMLInputElement)?.files?.[0];
    if (!file) return showAlert("Pick a file");
    setStatus("Uploading…");
    const r = await uploadAttach(currentNoteId!, file);
    setStatus(r.ok ? "Uploaded" : "Upload failed", r.ok ? "ok" : "err");
    if (r.ok) { noteData = await getNote(currentNoteId!); renderEditor(); }
  });

  bind("#n-save", "click", doSave);
  bind("#n-del", "click", doDelete);
  bind("#n-export", "click", () => window.open(`/api/notes/${currentNoteId}/export`));
  bind("#n-share", "click", doShare);
  bind("#n-folder", "click", doFolder);
  bind("#n-title", "input", () => { if (!dirty) { dirty=true; setStatus("Unsaved"); } });
  bind("#n-body", "input", () => { if (!dirty) { dirty=true; setStatus("Unsaved"); } renderPreview(); });
}

function renderPreview() {
  const body = ($("#n-body") as HTMLTextAreaElement)?.value || "";
  const preview = document.getElementById("n-preview");
  if (preview) preview.innerHTML = body.trim() ? mdHtml(body) : '<span style="color:var(--muted)">Preview</span>';
}

function setStatus(t: string, k?: string) {
  const s = document.getElementById("n-status");
  if (s) { s.textContent = t; s.className = "status" + (k ? ` ${k}` : ""); }
}

async function doSave() {
  if (!currentNoteId) return;
  setStatus("Saving…");
  const title = ($("#n-title") as HTMLInputElement)?.value || "";
  const body = ($("#n-body") as HTMLTextAreaElement)?.value || "";
  await updateNote(currentNoteId, { title, body });
  dirty = false;
  setStatus("Saved", "ok");
  noteData.title = title;
  noteData.body = body;
  renderSidebar();
}

async function doDelete() {
  if (!currentNoteId) return;
  const ok = await showConfirm("Delete permanently?");
  if (!ok) return;
  await deleteNote(currentNoteId);
  currentNoteId = null; noteData = null;
  await refresh();
}

async function doShare() {
  if (!noteData) return;
  const mode = await showModal("Visibility", { input: noteData.visibility || "LINK", okText: "Set" });
  if (!mode) return;
  const v = mode.toUpperCase();
  let expiresIn = 0;
  if (v === "LINK") {
    const e = await showModal("Expire in seconds (0 = never)", { input: "0", okText: "Set" });
    expiresIn = parseInt(e || "0", 10);
  }
  noteData = await shareNote(currentNoteId!, v, expiresIn);
  setStatus(noteData.visibility + (noteData.shareToken ? ` · s/${noteData.shareToken}` : ""), "ok");
  if (noteData.shareToken) {
    const url = `${location.origin}#/s/${noteData.shareToken}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    await showAlert(`Link copied:\n${url}`);
  }
}

async function doFolder() {
  if (!noteData) return;
  const f = await showModal("Folder name", { input: noteData.folder || "", placeholder: "folder name" });
  if (f === null) return;
  const v = f.trim() || null;
  await updateNote(currentNoteId!, { folder: v });
  noteData.folder = v;
  document.getElementById("n-folder-label")!.textContent = v || "none";
  await refresh();
}

async function doNew() {
  const t = await showModal("Title", { input: "Untitled", okText: "Create" });
  if (!t?.trim()) return;
  const note = await createNote(t.trim());
  if (note) { currentNoteId = note.id; noteData = note; await refresh(); }
}

// --- Sidebar ---
function openSidebar() { document.getElementById("sidebar")!.classList.add("open"); document.getElementById("overlay")!.classList.add("open"); }
function closeSidebar() { document.getElementById("sidebar")!.classList.remove("open"); document.getElementById("overlay")!.classList.remove("open"); }

// --- App init ---
async function refresh() {
  if (!(await loadData())) { document.getElementById("app")!.innerHTML = `<div class="auth-wrap"><div class="auth-card"><h1>Sign in</h1><p class="sub">Session cookie.</p><form id="lf"><label><span>Email</span><input name="email" type="email" value="paulo@local"></label><label><span>Password</span><input name="password" type="password"></label><p id="lerr" style="color:var(--danger);display:none"></p><button type="submit">Continue</button></form></div></div>`;
    document.getElementById("lf")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target as HTMLFormElement);
      const r = await login(String(fd.get("email")), String(fd.get("password")));
      if (!r.ok) { const el = document.getElementById("lerr"); if (el) { el.textContent = "Wrong."; el.style.display = ""; } return; }
      await refresh();
    });
    return;
  }
  renderApp();
}

function renderApp() {
  document.getElementById("app")!.innerHTML = `
    <div class="sidebar-overlay" id="overlay"></div>
    <div class="app-layout">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-head">
          <button class="ghost mobile-only" id="sb-close">${icon("x")}</button>
          <h1>Notes</h1>
          <button class="ghost" id="theme-btn">${icon("moon")}</button>
          <button id="new-btn">${icon("plus")}</button>
        </div>
        <div class="sidebar-search" style="display:flex;align-items:center;gap:.35rem;padding:.5rem .6rem;border-bottom:1px solid var(--line)">
          ${icon("search",14)}
          <input id="sq" type="search" placeholder="Search" style="flex:1;background:var(--paper);border:1px solid var(--line);border-radius:var(--radius-sm);padding:.35rem .6rem;font-size:.8125rem;width:100%">
        </div>
        <nav class="sidebar-nav" id="sidebar-nav"></nav>
      </aside>
      <main class="main-area" id="main-area"></main>
    </div>
    <div id="modal" class="dialog-overlay"><div class="dialog-panel" id="modal-content"></div></div>`;

  overlay?.addEventListener("click", closeSidebar);
  bind("#sb-close", "click", closeSidebar);
  bind("#theme-btn", "click", () => {
    const isLight = document.documentElement.className === "light";
    document.documentElement.className = isLight ? "" : "light";
    localStorage.setItem("notes-theme", isLight ? "dark" : "light");
  });
  bind("#new-btn", "click", doNew);
  bind("#sq", "input", () => {
    searchQuery = ($("#sq") as HTMLInputElement).value;
    renderSidebar();
  });

  renderSidebar();
  if (currentNoteId) renderEditor();
  else {
    const main = document.getElementById("main-area")!;
    main.innerHTML = `<div class="empty-state"><button class="ghost mobile-only" id="sb-open">${icon("menu",20)}</button><h2>Select a note</h2><p>Pick one from the sidebar or create a new one.</p><button class="primary" id="empty-new">${icon("plus")} New note</button></div>`;
    bind("#sb-open", "click", () => openSidebar());
    bind("#empty-new", "click", () => doNew());
  }

  if (window.innerWidth <= 800) openSidebar();
}

// --- Keyboard ---
window.addEventListener("keydown", (e) => {
  if ((e.metaKey||e.ctrlKey) && e.key === "s") { e.preventDefault(); doSave(); }
});

// --- Start ---
document.addEventListener("DOMContentLoaded", () => refresh());
