import "./style.css";

const ICONS: Record<string, string> = {
  folder:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
  moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
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
  tag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>',
};

function icon(name: string, s = 16) { return `<span class="lucide" style="width:${s}px;height:${s}px">${ICONS[name]||""}</span>`; }
function esc(s: unknown) { return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]); }
function mdHtml(t: string) {
  let h = esc(t)
    .replace(/^### (.+)$/gm,"<h3>$1</h3>").replace(/^## (.+)$/gm,"<h2>$1</h2>").replace(/^# (.+)$/gm,"<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\*(.+?)\*/g,"<em>$1</em>").replace(/`([^`]+)`/g,"<code>$1</code>")
    .replace(/^- (.+)$/gm,"<li>$1</li>").replace(/\n\n/g,"</p><p>").replace(/^([^<].*)$/gm,m=>m.startsWith("<")?m:`<p>${m}</p>`);
  // [[wiki links]] → clickable links (search by title)
  h = h.replace(/\[\[([^\]]+)\]\]/g, (_, title: string) => {
    const slug = title.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const match = allNotes.find(n => n.title.toLowerCase() === title.trim().toLowerCase() || n.slug === slug);
    if (match) return `<a href="#/note/${match.id}" class="wikilink">${esc(title.trim())}</a>`;
    return `<span class="wikilink broken" title="Note not found">${esc(title.trim())}</span>`;
  });
  return h;
}

// --- Modal ---
let modalResolve: ((v: string|null)=>void)|null = null;
let modalActive = false;

function modalHTML(html: string): Promise<string|null> {
  return new Promise(resolve => {
    modalResolve = resolve; modalActive = true;
    document.getElementById("modal-content")!.innerHTML = html;
    document.getElementById("modal")!.classList.add("open");
  });
}

function showInput(title: string, opts?: { value?: string; placeholder?: string }): Promise<string|null> {
  return modalHTML(`<div class="modal-card"><h3>${esc(title)}</h3><input id="modal-input" value="${esc(opts?.value||"")}" placeholder="${esc(opts?.placeholder||"")}" autofocus><div class="modal-actions"><button id="modal-cancel" class="ghost">Cancel</button><button id="modal-ok" class="primary">OK</button></div></div>`);
}

function showConfirm(title: string): Promise<boolean> {
  return modalHTML(`<div class="modal-card"><h3>${esc(title)}</h3><div class="modal-actions"><button id="modal-cancel" class="ghost">Cancel</button><button id="modal-ok" class="danger">Delete</button></div></div>`).then(v => v !== null);
}

function showMsg(msg: string): Promise<void> {
  return modalHTML(`<div class="modal-card"><p style="margin:0 0 1rem;color:var(--ink-soft)">${esc(msg)}</p><div class="modal-actions"><button id="modal-ok" class="primary">OK</button></div></div>`).then(() => {});
}

document.addEventListener("click", e => {
  if (!modalActive) return;
  const t = (e.target as HTMLElement);
  if (t.closest("#modal-cancel")) { closeModal(); modalResolve?.(null); }
  if (t.closest("#modal-ok")) {
    const val = (document.getElementById("modal-input") as HTMLInputElement)?.value;
    closeModal();
    modalResolve?.(val !== undefined ? val : "");
  }
});

function closeModal() { document.getElementById("modal")!.classList.remove("open"); modalActive = false; }

// --- Persistence ---
let currentNoteId: string|null = localStorage.getItem("nid") || null;
let noteData: any = null;
let dirty = false;
let searchQuery = "";
let allNotes: any[] = [];
const LS_NID = "nid", LS_DRAFT = "ndraft_", LS_TITLE = "ntitle_";

function persistNoteId(id: string|null) {
  currentNoteId = id;
  if (id) localStorage.setItem(LS_NID, id);
  else localStorage.removeItem(LS_NID);
}

function persistDraft(id: string, title: string, body: string) {
  if (title || body) { localStorage.setItem(LS_DRAFT + id, body); localStorage.setItem(LS_TITLE + id, title); }
  else { localStorage.removeItem(LS_DRAFT + id); localStorage.removeItem(LS_TITLE + id); }
}

function clearDraft(id: string) { localStorage.removeItem(LS_DRAFT + id); localStorage.removeItem(LS_TITLE + id); }

// --- API ---
async function api(path: string, opts: RequestInit = {}) {
  const h: Record<string,string> = { ...opts.headers as any };
  if (!h["content-type"] && !(opts.body instanceof FormData)) h["content-type"] = "application/json";
  return fetch(path, { credentials: "include", ...opts, headers: h });
}

async function login(email: string, password: string) {
  return api("/api/auth/login", { method:"POST", body:JSON.stringify({email,password}) });
}

async function loadData() {
  const u = await (await api("/api/auth/me")).json();
  if (u.error) return false;
  const nr = await api(searchQuery ? `/api/notes?q=${encodeURIComponent(searchQuery)}` : "/api/notes");
  allNotes = (await nr.json()).notes || [];
  return true;
}

async function fetchNote(id: string) {
  const r = await api(`/api/notes/${id}`);
  if (!r.ok) return null;
  return (await r.json()).note;
}

async function saveNote(id: string, data: any) {
  await api(`/api/notes/${id}`, { method:"PATCH", body:JSON.stringify(data) });
}

async function removeNote(id: string) {
  await api(`/api/notes/${id}`, { method:"DELETE" });
}

async function newNote(title: string, folder?: string) {
  const r = await api("/api/notes", { method:"POST", body:JSON.stringify({title, body:"", folder:folder||null}) });
  return (await r.json()).note;
}

async function setShare(id: string, vis: string, exp = 0) {
  const b: any = { visibility: vis };
  if (exp > 0) b.expiresIn = exp;
  const r = await api(`/api/notes/${id}/share`, { method:"POST", body:JSON.stringify(b) });
  return (await r.json()).note;
}

async function uploadFile(id: string, file: File) {
  const fd = new FormData(); fd.append("file", file);
  return api(`/api/notes/${id}/attachments`, { method:"POST", body:fd });
}

async function getAttachUrl(id: string) {
  const r = await api(`/api/attachments/${id}/url`);
  return r.ok ? (await r.json()).url : null;
}

// --- Render ---
const $ = (s: string) => document.querySelector(s);
const $$ = (s: string) => document.querySelectorAll(s);

function bind(sel: string, ev: string, fn: (e: Event)=>void) {
  const el = typeof sel === "string" ? $(sel) : sel;
  el?.addEventListener(ev, fn);
}

function refreshSidebar() {
  const nav = document.getElementById("sidebar-nav")!;
  const q = searchQuery.toLowerCase();
  const notes = allNotes.filter(n => !q || n.title.toLowerCase().includes(q) || (n.body||"").toLowerCase().includes(q));
  const groups = new Map<string, typeof notes>();
  for (const n of notes) {
    const f = n.folder || "(no folder)";
    if (!groups.has(f)) groups.set(f, []);
    groups.get(f)!.push(n);
  }

  nav.innerHTML = "";
  const hasNote = !!currentNoteId;
  for (const [folder, items] of groups) {
    const h = document.createElement("div");
    h.className = "folder-header";
    const defaultCollapsed = hasNote;
    h.innerHTML = `${icon(defaultCollapsed ? "chevron-right" : "chevron-down")}${esc(folder)} <span style="margin-left:auto;color:var(--muted);font-weight:400">${items.length}</span>`;
    h.dataset.expanded = defaultCollapsed ? "0" : "1";
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
    c.style.display = defaultCollapsed ? "none" : "";
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
  const note = await fetchNote(id);
  if (!note) { showMsg("Note not found"); return; }
  persistNoteId(id);
  noteData = note;
  dirty = false;
  clearDraft(id);
  refreshSidebar();
  renderEditor();
  loadBacklinks(id);
  closeSidebar();
}

async function loadBacklinks(id: string) {
  const panel = document.getElementById("backlinks-panel");
  if (!panel) return;
  try {
    const r = await api(`/api/notes/${id}/backlinks`);
    if (!r.ok) { panel.style.display = "none"; return; }
    const d = await r.json();
    const bl = d.backlinks || [];
    if (!bl.length) { panel.style.display = "none"; return; }
    panel.style.display = "";
    panel.innerHTML = `<div style="font-size:.675rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:.35rem">Backlinks (${bl.length})</div>` +
      bl.map((n: any) => `<a class="nav-item" data-id="${n.id}" style="margin:0;padding:.3rem .5rem;font-size:.8125rem">${icon("file-text",12)}<span style="flex:1">${esc(n.title)}</span></a>`).join("");
    panel.querySelectorAll(".nav-item").forEach(el => el.addEventListener("click", (e: Event) => {
      e.preventDefault();
      const id = (el as HTMLElement).dataset.id;
      if (id) openNote(id);
    }));
  } catch { panel.style.display = "none"; }
}

function renderEditor() {
  const main = document.getElementById("main-area")!;
  if (!currentNoteId || !noteData) {
    main.innerHTML = `<div class="empty-state"><button class="ghost mobile-only" id="sb-open">${icon("menu",20)}</button><h2>Select a note</h2><p>Pick one from the sidebar or create a new one.</p><button class="primary" id="empty-new">${icon("plus")} New note</button></div>`;
    bind("#sb-open","click",() => openSidebar());
    bind("#empty-new","click",() => newNoteAction());
    return;
  }

  const n = noteData;
  let attachHtml = "";
  if (n.attachments?.length) {
    for (const a of n.attachments) {
      const isImg = a.mimeType?.startsWith("image/");
      const imgSnippet = isImg ? `<img data-attach-id="${a.id}" loading="lazy" style="max-width:60px;max-height:60px;border-radius:4px;object-fit:cover;flex-shrink:0;background:var(--panel)">` : "";
      attachHtml += `<div class="attach-row">${imgSnippet}<span class="grow">${esc(a.filename)}</span><button class="attach-open" data-id="${a.id}">${isImg ? "View" : "Open"}</button></div>`;
    }
  } else attachHtml = '<span style="color:var(--muted);font-size:0.8125rem">No attachments.</span>';

  // Restore draft if available
  const draftBody = localStorage.getItem(LS_DRAFT + currentNoteId);
  const draftTitle = localStorage.getItem(LS_TITLE + currentNoteId);
  const bodyVal = draftBody !== null ? draftBody : n.body;
  const titleVal = draftTitle !== null ? draftTitle : n.title;
  if (draftBody !== null || draftTitle !== null) dirty = true;

  main.innerHTML = `
    <div class="editor-top">
      <button class="ghost mobile-only" id="sb-open">${icon("menu")}</button>
      <span class="status" id="n-status">${dirty ? "Unsaved" : esc(n.visibility) + (n.shareToken ? " · s/"+n.shareToken : "")}</span>
      <button class="ghost" id="n-folder" style="font-size:.8125rem;color:var(--muted)">${icon("folder")} <span id="n-folder-label">${esc(n.folder||"none")}</span></button>
      <button id="n-tags" class="ghost" style="font-size:.8125rem;color:var(--muted)" title="Edit tags">${icon("tag")} <span id="n-tag-label">${(n.tags||[]).length||"0"} tags</span></button>
      <button id="n-share">${icon("share")}</button>
      <button id="n-export">${icon("download")}</button>
      <button class="primary" id="n-save">Save</button>
      <button class="danger" id="n-del">${icon("trash-2")}</button>
    </div>
    <div class="editor-scroll">
      <input id="n-title" class="title-field" value="${esc(titleVal)}" placeholder="Note title">
      <div class="editor-split">
        <div class="editor-pane"><textarea id="n-body" placeholder="Write in Markdown…">${esc(bodyVal)}</textarea></div>
        <div class="preview-pane" id="preview"></div>
      </div>
      <section class="attach-area">
        <div class="attach-head" id="attach-toggle" style="cursor:pointer">${icon("chevron-right",14)} <strong>Attachments</strong><span style="color:var(--muted);font-weight:400;font-size:.75rem;margin-left:.25rem">${n.attachments?.length||0} files</span></div>
        <div id="attach-body" style="display:none">
          <div class="attach-head" style="margin-top:.5rem"><input type="file" id="n-file" style="flex:1;font-size:.8125rem"><button id="n-upload">Upload</button></div>
          <div id="n-files">${attachHtml}</div>
        </div>
      </section>
    </div>`;

  renderPreview();
  bind("#sb-open","click",() => openSidebar());
  $$(".attach-open").forEach(el => el.addEventListener("click", async () => {
    const url = await getAttachUrl((el as HTMLElement).dataset.id!);
    if (url) window.open(url, "_blank", "noopener");
  }));
  bind("#n-upload","click", async () => {
    const file = ($("#n-file") as HTMLInputElement)?.files?.[0];
    if (!file) { showMsg("Pick a file"); return; }
    setStatus("Uploading…");
    const r = await uploadFile(currentNoteId!, file);
    if (!r.ok) { setStatus("Upload failed", "err"); return; }
    setStatus("Uploaded", "ok");
    const updated = await fetchNote(currentNoteId!);
    if (updated) { noteData = updated; renderEditor(); }
    // Insert image markdown at cursor for images
    if (file.type.startsWith("image/") && updated) {
      const lastAttach = updated.attachments?.[updated.attachments.length - 1];
      if (lastAttach) {
        const fetchUrl = await getAttachUrl(lastAttach.id);
        if (fetchUrl) {
          const bodyEl = document.getElementById("n-body") as HTMLTextAreaElement;
          if (bodyEl) {
            const imgTag = `![${file.name}](${fetchUrl})`;
            const start = bodyEl.selectionStart;
            bodyEl.value = bodyEl.value.slice(0, start) + imgTag + bodyEl.value.slice(bodyEl.selectionEnd);
            bodyEl.selectionStart = bodyEl.selectionEnd = start + imgTag.length;
            bodyEl.dispatchEvent(new Event("input"));
          }
        }
      }
    }
  });
  // Load image thumbnails after render
  document.querySelectorAll("[data-attach-id]").forEach(el => {
    const id = (el as HTMLElement).dataset.attachId!;
    getAttachUrl(id).then(url => { if (url) (el as HTMLImageElement).src = url; });
  });
  bind("#n-save","click", saveAction);
  bind("#n-del","click", delAction);
  bind("#n-export","click", async () => {
    if (!currentNoteId) return;
    const fmt = await showInput("Export format", { value: "md", placeholder: "md or html" });
    if (!fmt) return;
    window.open(`/api/notes/${currentNoteId}/export?format=${fmt.trim()}`, "_blank");
  });
  bind("#n-share","click", shareAction);
  bind("#n-folder","click", folderAction);
  bind("#n-tags","click", tagsAction);
  bind("#attach-toggle","click", () => {
    const b = document.getElementById("attach-body"); const ic = document.querySelector("#attach-toggle .lucide");
    if (b) { const v = b.style.display !== "none"; b.style.display = v ? "none" : ""; if (ic) ic.innerHTML = ICONS[v ? "chevron-right" : "chevron-down"]!; }
  });

  // Draft persistence on edit
  const titleIn = $("#n-title") as HTMLInputElement;
  const bodyIn = $("#n-body") as HTMLTextAreaElement;
  let draftTimer: number;
  function onEdit() {
    if (!dirty) { dirty = true; setStatus("Unsaved"); }
    clearTimeout(draftTimer);
    draftTimer = window.setTimeout(() => {
      persistDraft(currentNoteId!, titleIn.value, bodyIn.value);
    }, 500);
  }
  titleIn?.addEventListener("input", onEdit);
  bodyIn?.addEventListener("input", () => { onEdit(); renderPreview(); });
}

function renderPreview() {
  const body = ($("#n-body") as HTMLTextAreaElement)?.value || "";
  const preview = document.getElementById("preview");
  if (preview) preview.innerHTML = body.trim() ? mdHtml(body) : '<span style="color:var(--muted)">Preview</span>';
}

function setStatus(t: string, k?: string) {
  const s = document.getElementById("n-status");
  if (s) { s.textContent = t; s.className = "status" + (k ? ` ${k}` : ""); }
}

async function saveAction() {
  if (!currentNoteId) return;
  const title = ($("#n-title") as HTMLInputElement)?.value || "";
  const body = ($("#n-body") as HTMLTextAreaElement)?.value || "";
  setStatus("Saving…");
  await saveNote(currentNoteId, { title, body });
  dirty = false;
  clearDraft(currentNoteId);
  setStatus("Saved", "ok");
  noteData.title = title; noteData.body = body;
  if (!searchQuery) refreshSidebar();
}

async function delAction() {
  if (!currentNoteId) return;
  const ok = await showConfirm("Delete permanently?");
  if (!ok) return;
  await removeNote(currentNoteId);
  persistNoteId(null); noteData = null; clearDraft(currentNoteId);
  await loadData(); refreshSidebar(); renderEditor();
}

async function shareAction() {
  if (!noteData) return;
  const mode = await showInput("Visibility", { value: noteData.visibility || "LINK" });
  if (!mode) return;
  const v = mode.toUpperCase();
  let exp = 0;
  if (v === "LINK") { const e = await showInput("Expire in seconds (0 = never)", { value: "0" }); exp = parseInt(e||"0", 10); }
  noteData = await setShare(currentNoteId!, v, exp);
  setStatus(noteData.visibility + (noteData.shareToken ? " · s/"+noteData.shareToken : ""), "ok");
  if (noteData.shareToken) {
    const url = `${location.origin}#/s/${noteData.shareToken}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    showMsg("Link copied:\n" + url);
  }
}

async function folderAction() {
  if (!noteData) return;
  const f = await showInput("Folder name", { value: noteData.folder || "", placeholder: "folder name" });
  if (f === null) return;
  const v = f.trim() || null;
  await saveNote(currentNoteId!, { folder: v });
  noteData.folder = v;
  document.getElementById("n-folder-label")!.textContent = v || "none";
  await loadData(); refreshSidebar();
}

async function tagsAction() {
  if (!noteData) return;
  const t = await showInput("Tags (comma separated)", { value: (noteData.tags||[]).join(", ") });
  if (t === null) return;
  const tags = t.split(",").map((s: string) => s.trim()).filter(Boolean);
  await saveNote(currentNoteId!, { tags });
  noteData.tags = tags;
  document.getElementById("n-tag-label")!.textContent = tags.length + " tags";
}

async function newNoteAction() {
  const t = await showInput("Title", { value: "Untitled" });
  if (!t?.trim()) return;
  const note = await newNote(t.trim());
  if (note) { persistNoteId(note.id); noteData = note; await loadData(); refreshSidebar(); renderEditor(); }
}

// --- Sidebar ---
function openSidebar() { document.getElementById("sidebar")!.classList.add("open"); document.getElementById("overlay")!.classList.add("open"); }
function closeSidebar() { document.getElementById("sidebar")!.classList.remove("open"); document.getElementById("overlay")!.classList.remove("open"); }

// --- Keyboard ---
window.addEventListener("keydown", e => {
  if ((e.metaKey||e.ctrlKey) && e.key === "s") { e.preventDefault(); saveAction(); }
});

window.addEventListener("beforeunload", e => {
  if (dirty) { e.preventDefault(); e.returnValue = ""; }
});

// --- Init ---
async function init() {
  if (!(await loadData())) {
    document.getElementById("app")!.innerHTML = `
      <div class="auth-wrap"><div class="auth-card">
        <h1>Sign in</h1><p class="sub">Session cookie.</p>
        <form id="lf"><label><span>Email</span><input name="email" type="email" value="paulo@local"></label><label><span>Password</span><input name="password" type="password"></label>
        <p id="lerr" style="color:var(--danger);display:none"></p><button type="submit">Continue</button></form>
      </div></div>`;
    document.getElementById("lf")?.addEventListener("submit", async e => {
      e.preventDefault();
      const fd = new FormData(e.target as HTMLFormElement);
      const r = await login(String(fd.get("email")), String(fd.get("password")));
      if (!r.ok) { const el = document.getElementById("lerr"); if (el) { el.textContent = "Wrong."; el.style.display = ""; } return; }
      init();
    });
    return;
  }
  renderShell();
}

async function renderShell() {
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
        <nav class="sidebar-nav" id="sidebar-nav" style="flex:1;overflow-y:auto"></nav>
        <div id="backlinks-panel" style="display:none;border-top:1px solid var(--line);background:var(--panel-deep);padding:.5rem .75rem;max-height:30vh;overflow-y:auto"></div>
      </aside>
      <main class="main-area" id="main-area"></main>
    </div>
    <div id="modal" class="dialog-overlay"><div class="dialog-panel" id="modal-content"></div></div>`;

  document.getElementById("overlay")?.addEventListener("click", closeSidebar);
  bind("#sb-close","click", closeSidebar);
  bind("#theme-btn","click", () => {
    const l = document.documentElement.className === "light";
    document.documentElement.className = l ? "" : "light";
    localStorage.setItem("notes-theme", l ? "dark" : "light");
  });
  bind("#new-btn","click", newNoteAction);
  bind("#sq","input", () => {
    searchQuery = ($("#sq") as HTMLInputElement).value;
    refreshSidebar();
  });

  refreshSidebar();

  // Restore previous note or show empty state
  if (currentNoteId) {
    const note = await fetchNote(currentNoteId);
    if (note) { noteData = note; renderEditor(); }
    else { persistNoteId(null); renderEditor(); }
  } else renderEditor();

  if (window.innerWidth <= 800) openSidebar();
}

document.addEventListener("DOMContentLoaded", init);
