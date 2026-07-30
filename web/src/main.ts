import "./style.css";
import { icon, renderIcons } from "./icons";

// ── Helper ──
function esc(s: unknown) { return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]); }
function mdHtml(t: string) {
  let h = esc(t)
    .replace(/^### (.+)$/gm,"<h3>$1</h3>").replace(/^## (.+)$/gm,"<h2>$1</h2>").replace(/^# (.+)$/gm,"<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\*(.+?)\*/g,"<em>$1</em>").replace(/`([^`]+)`/g,"<code>$1</code>")
    .replace(/^- (.+)$/gm,"<li>$1</li>").replace(/\n\n/g,"</p><p>").replace(/^([^<].*)$/gm,m=>m.startsWith("<")?m:`<p>${m}</p>`);
  h = h.replace(/\[\[([^\]]+)\]\]/g, (_, t: string) => {
    const m = allNotes.find(n => n.title.toLowerCase() === t.trim().toLowerCase());
    if (m) return `<a href="#/note/${m.id}" class="wikilink">${esc(t.trim())}</a>`;
    return `<span class="wikilink broken">${esc(t.trim())}</span>`;
  });
  return h;
}

// ── Icons (lucide) ──
const ICONS = ["arrow-left","moon","sun","plus","menu","x","share","download","trash-2","search","chevron-down","chevron-right","file-text","tag","copy","lock","clock","eye","eye-off","bar-chart","refresh","folder"];
function icon(name: string, size = 16) {
  return `<i data-lucide="${name}" style="width:${size}px;height:${size}px;display:inline-flex;flex-shrink:0"></i>`;
}
function renderIcons() {
  const map: Record<string, any> = {};
  for (const k of ICONS) if (li[k as keyof typeof li]) map[k] = li[k as keyof typeof li];
  createIcons({ icons: map, attrs: { "stroke-width": "2" } });
}

// ── Modal ──
let modalResolve: ((v: string|null)=>void)|null = null;
let modalActive = false;
function modalHTML(html: string): Promise<string|null> {
  return new Promise(r => { modalResolve = r; modalActive = true;
    document.getElementById("modal-content")!.innerHTML = html; document.getElementById("modal")!.classList.add("open"); renderIcons(); });
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
    closeModal(); modalResolve?.(val !== undefined ? val : "");
  }
});
function closeModal() { document.getElementById("modal")!.classList.remove("open"); modalActive = false; }

// ── Persistence ──
let currentNoteId: string|null = localStorage.getItem("nid") || null;
let noteData: any = null;
let dirty = false;
let searchQuery = "";
let allNotes: any[] = [];
function persistNoteId(id: string|null) {
  currentNoteId = id;
  if (id) localStorage.setItem("nid", id); else localStorage.removeItem("nid");
}
function persistDraft(id: string, t: string, b: string) {
  if (t || b) { localStorage.setItem("nd_"+id, b); localStorage.setItem("nt_"+id, t); }
  else { localStorage.removeItem("nd_"+id); localStorage.removeItem("nt_"+id); }
}

// ── API ──
async function api(path: string, opts: RequestInit = {}) {
  const h: Record<string,string> = { ...opts.headers as any };
  if (!h["content-type"] && !(opts.body instanceof FormData)) h["content-type"] = "application/json";
  return fetch(path, { credentials: "include", ...opts, headers: h });
}
async function login(e: string, p: string) { return api("/api/auth/login", { method:"POST", body:JSON.stringify({email:e,password:p}) }); }
async function loadData() {
  if ((await (await api("/api/auth/me")).json()).error) return false;
  allNotes = (await (await api(searchQuery ? `/api/notes?q=${encodeURIComponent(searchQuery)}` : "/api/notes")).json()).notes || [];
  return true;
}
async function fetchNote(id: string) { const r = await api(`/api/notes/${id}`); return r.ok ? (await r.json()).note : null; }
async function saveNote(id: string, d: any) { await api(`/api/notes/${id}`, { method:"PATCH", body:JSON.stringify(d) }); }
async function removeNote(id: string) { await api(`/api/notes/${id}`, { method:"DELETE" }); }
async function newNote(t: string, f?: string) { const r = await api("/api/notes", { method:"POST", body:JSON.stringify({title:t,body:"",folder:f||null}) }); return (await r.json()).note; }
async function setShare(id: string, vis: string, exp = 0, pw?: string, mv?: number) {
  const b: any = { visibility: vis };
  if (exp > 0) b.expiresIn = exp;
  if (pw) b.password = pw;
  if (mv && mv > 0) b.maxViews = mv;
  return (await (await api(`/api/notes/${id}/share`, { method:"POST", body:JSON.stringify(b) })).json()).note;
}
async function uploadFile(id: string, f: File) { const fd = new FormData(); fd.append("file", f); return api(`/api/notes/${id}/attachments`, { method:"POST", body:fd }); }
async function getAttachUrl(id: string) { const r = await api(`/api/attachments/${id}/url`); return r.ok ? (await r.json()).url : null; }

// ── Render ──
const $ = (s: string) => document.querySelector(s);
const $$ = (s: string) => document.querySelectorAll(s);
function bind(sel: string, ev: string, fn: (e: Event)=>void) { (typeof sel === "string" ? $(sel) : sel)?.addEventListener(ev, fn); }

function renderSidebar() {
  const nav = document.getElementById("sidebar-nav")!;
  const q = searchQuery.toLowerCase();
  const notes = allNotes.filter(n => !q || n.title.toLowerCase().includes(q) || (n.body||"").toLowerCase().includes(q));
  const groups = new Map<string, typeof notes>();
  for (const n of notes) { const f = n.folder || "(no folder)"; if (!groups.has(f)) groups.set(f, []); groups.get(f)!.push(n); }
  nav.innerHTML = "";
  const hasNote = !!currentNoteId;
  for (const [folder, items] of groups) {
    const defColl = hasNote;
    const h = document.createElement("div");
    h.className = "folder-header";
    h.innerHTML = `<i data-lucide="${defColl?"chevron-right":"chevron-down"}" style="width:12px;height:12px;flex-shrink:0"></i>${esc(folder)} <span style="margin-left:auto;color:var(--muted);font-weight:400">${items.length}</span>`;
    h.dataset.expanded = defColl ? "0" : "1";
    h.addEventListener("click", () => {
      const next = h.nextElementSibling as HTMLElement|null;
      if (!next) return;
      const exp = h.dataset.expanded === "1";
      h.dataset.expanded = exp ? "0" : "1";
      next.style.display = exp ? "none" : "";
      const ic = h.querySelector("[data-lucide]");
      if (ic) ic.setAttribute("data-lucide", exp ? "chevron-right" : "chevron-down");
    });
    nav.appendChild(h);
    const c = document.createElement("div");
    c.style.display = defColl ? "none" : "";
    for (const n of items) {
      const a = document.createElement("a");
      a.className = "nav-item" + (n.id === currentNoteId ? " active" : "");
      a.innerHTML = `<i data-lucide="file-text" style="width:14px;height:14px;flex-shrink:0"></i><span style="flex:1">${esc(n.title)}</span>${n.visibility!=="PRIVATE"?`<span class="badge">${esc(n.visibility)}</span>`:""}`;
      a.addEventListener("click", (e) => { e.preventDefault(); openNote(n.id); });
      c.appendChild(a);
    }
    nav.appendChild(c);
  }
  if (!notes.length) nav.innerHTML = '<div style="padding:1rem 0.75rem;color:var(--muted);font-size:0.8125rem">No notes.</div>';
  renderIcons();
}

async function openNote(id: string) {
  const note = await fetchNote(id);
  if (!note) { showMsg("Note not found"); return; }
  persistNoteId(id); noteData = note; dirty = false;
  localStorage.removeItem("nd_"+id); localStorage.removeItem("nt_"+id);
  renderSidebar(); renderEditor(); loadBacklinks(id); closeSidebar();
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
      bl.map((n: any) => `<a class="nav-item" data-id="${n.id}" style="margin:0;padding:.3rem .5rem;font-size:.8125rem"><i data-lucide="file-text" style="width:12px;height:12px;flex-shrink:0"></i><span style="flex:1">${esc(n.title)}</span></a>`).join("");
    panel.querySelectorAll(".nav-item").forEach(el => el.addEventListener("click", (e: Event) => { e.preventDefault(); const id = (el as HTMLElement).dataset.id; if (id) openNote(id); }));
    renderIcons();
  } catch { panel.style.display = "none"; }
}

function renderEditor() {
  const main = document.getElementById("main-area")!;
  if (!currentNoteId || !noteData) {
    main.innerHTML = `<div class="empty-state"><button class="ghost mobile-only" id="sb-open" aria-label="Open sidebar" title="Open sidebar"><i data-lucide="menu" style="width:20px;height:20px"></i></button><h2>Select a note</h2><p>Pick one from the sidebar or create a new one.</p><button class="primary" id="empty-new" title="Create new note"><i data-lucide="plus" style="width:16px;height:16px"></i> New note</button></div>`;
    bind("#sb-open","click",() => openSidebar()); bind("#empty-new","click",() => newNoteAction()); renderIcons();
    return;
  }
  const n = noteData;
  const db = localStorage.getItem("nd_"+currentNoteId);
  const dt = localStorage.getItem("nt_"+currentNoteId);
  const bv = db !== null ? db : n.body;
  const tv = dt !== null ? dt : n.title;
  if (db !== null || dt !== null) dirty = true;
  let ah = "";
  if (n.attachments?.length) {
    for (const a of n.attachments) {
      const isImg = a.mimeType?.startsWith("image/");
      ah += `<div class="attach-row">${isImg ? `<img data-attach-id="${a.id}" loading="lazy" style="max-width:60px;max-height:60px;border-radius:4px;object-fit:cover;flex-shrink:0;background:var(--panel)">` : ""}<span class="grow">${esc(a.filename)}</span><button class="attach-open" data-id="${a.id}">${isImg?"View":"Open"}</button></div>`;
    }
  } else ah = '<span style="color:var(--muted);font-size:0.8125rem">No attachments.</span>';
  main.innerHTML = `
    <div class="editor-top" role="toolbar" aria-label="Note actions">
      <button class="ghost mobile-only" id="sb-open" aria-label="Open sidebar" title="Open sidebar">${icon("menu",18)}</button>
      <button class="status" id="n-status" aria-label="Note visibility, click to change" title="Change visibility">${icon("eye-off",12)} ${dirty ? "Unsaved" : esc(n.visibility).toLowerCase()}</button>
      <div class="meta-group">
        <button class="ghost btn-meta" id="n-folder" title="Change folder">${icon("folder",14)} <span id="n-folder-label">${esc(n.folder||"none")}</span></button>
        <button class="ghost btn-meta" id="n-tags" aria-label="Edit tags">${icon("tag",14)} <span id="n-tag-label">${(n.tags||[]).length||"0"} tags</span></button>
      </div>
      <div class="spacer"></div>
      <div class="action-group">
        <button id="n-share" aria-label="Share note" title="Share note">${icon("share",16)}</button>
        <button id="n-export" aria-label="Export note" title="Export note">${icon("download",16)}</button>
        <button class="primary" id="n-save" title="Save changes">Save</button>
        <div class="overflow-wrap">
          <button class="ghost" id="n-more" aria-label="More options" aria-haspopup="true" title="More">${icon("menu",16)}</button>
          <div class="overflow-menu" id="n-more-menu" style="display:none">
            <button class="danger" id="n-del" aria-label="Delete note" title="Delete note">${icon("trash-2",14)} Delete note</button>
          </div>
        </div>
      </div>
    </div>
    <div class="editor-scroll">
      <input id="n-title" class="title-field" value="${esc(tv)}" placeholder="Note title">
      <div class="editor-split">
        <div class="editor-pane"><textarea id="n-body" placeholder="Write…">${esc(bv)}</textarea></div>
        <div class="preview-pane" id="preview"></div>
      </div>
      <section class="attach-area">
        <div class="attach-head" id="attach-toggle" style="cursor:pointer"><i data-lucide="chevron-right" style="width:14px;height:14px"></i> <strong>Attachments</strong><span style="color:var(--muted);font-weight:400;font-size:.75rem;margin-left:.25rem">${n.attachments?.length||0} files</span></div>
        <div id="attach-body" style="display:none">
          <div class="attach-head" style="margin-top:.5rem"><input type="file" id="n-file" style="flex:1;font-size:.8125rem"><button id="n-upload" title="Upload file"><i data-lucide="plus" style="width:14px;height:14px"></i></button></div>
          <div id="n-files">${ah}</div>
        </div>
      </section>
    </div>`;
  renderPreview(); renderIcons();
  // Load thumbnails
  $$("[data-attach-id]").forEach(el => { const id = (el as HTMLElement).dataset.attachId!; getAttachUrl(id).then(u => { if (u) (el as HTMLImageElement).src = u; }); });
  // Bind events
  bind("#sb-open","click",() => openSidebar());
  $$(".attach-open").forEach(el => el.addEventListener("click", async () => { const u = await getAttachUrl((el as HTMLElement).dataset.id!); if (u) window.open(u, "_blank", "noopener"); }));
  bind("#n-upload","click", async () => {
    const file = ($("#n-file") as HTMLInputElement)?.files?.[0];
    if (!file) { showMsg("Pick a file"); return; }
    setStatus("Uploading…");
    const r = await uploadFile(currentNoteId!, file);
    if (!r.ok) { setStatus("Upload failed", "err"); return; }
    setStatus("Uploaded", "ok");
    const upd = await fetchNote(currentNoteId!);
    if (upd) { noteData = upd; renderEditor(); }
    if (file.type.startsWith("image/") && upd) {
      const la = upd.attachments?.[upd.attachments.length - 1];
      if (la) {
        const fu = await getAttachUrl(la.id);
        if (fu) {
          const be = document.getElementById("n-body") as HTMLTextAreaElement;
          if (be) { const s = be.selectionStart; be.value = be.value.slice(0,s) + "!["+file.name+"]("+fu+")" + be.value.slice(be.selectionEnd); be.selectionStart = be.selectionEnd = s + file.name.length + fu.length + 5; be.dispatchEvent(new Event("input")); }
        }
      }
    }
  });
  bind("#n-save","click", saveAction);
  bind("#n-del","click", delAction);
  bind("#n-more","click", () => {
    const m = document.getElementById("n-more-menu");
    if (m) m.style.display = m.style.display === "none" ? "" : "none";
  });
  document.addEventListener("click", (e) => {
    const m = document.getElementById("n-more-menu");
    if (m && m.style.display !== "none" && !(e.target as HTMLElement).closest("#n-more") && !(e.target as HTMLElement).closest("#n-more-menu")) m.style.display = "none";
  });
  bind("#n-status","click", shareAction);
  bind("#n-export","click", async () => {
    if (!currentNoteId) return;
    const fmt = await showInput("Format", { value: "md", placeholder: "md or html" });
    if (fmt) window.open(`/api/notes/${currentNoteId}/export?format=${fmt.trim()}`, "_blank");
  });
  bind("#n-share","click", shareAction);
  bind("#n-folder","click", folderAction);
  bind("#n-tags","click", tagsAction);
  bind("#attach-toggle","click", () => {
    const b = document.getElementById("attach-body"); const ic = document.querySelector("#attach-toggle [data-lucide]");
    if (b) { const v = b.style.display !== "none"; b.style.display = v ? "none" : ""; if (ic) ic.setAttribute("data-lucide", v ? "chevron-right" : "chevron-down"); renderIcons(); }
  });
  // Draft
  const ti = $("#n-title") as HTMLInputElement;
  const bi = $("#n-body") as HTMLTextAreaElement;
  let dt2: number;
  function onEdit() { if (!dirty) { dirty = true; setStatus("Unsaved"); } clearTimeout(dt2); dt2 = window.setTimeout(() => persistDraft(currentNoteId!, ti.value, bi.value), 500); }
  ti?.addEventListener("input", onEdit);
  bi?.addEventListener("input", () => { onEdit(); renderPreview(); });
}

function renderPreview() {
  const p = document.getElementById("preview");
  if (p) { const b = ($("#n-body") as HTMLTextAreaElement)?.value || ""; p.innerHTML = b.trim() ? mdHtml(b) : '<span style="color:var(--muted)">Preview</span>'; }
}
function setStatus(t: string, k?: string) { const s = document.getElementById("n-status"); if (s) { s.textContent = t; s.className = "status" + (k ? ` ${k}` : ""); } }

async function saveAction() {
  if (!currentNoteId) return;
  const t = ($("#n-title") as HTMLInputElement)?.value || "";
  const b = ($("#n-body") as HTMLTextAreaElement)?.value || "";
  setStatus("Saving…"); await saveNote(currentNoteId, { title: t, body: b });
  dirty = false; localStorage.removeItem("nd_"+currentNoteId); localStorage.removeItem("nt_"+currentNoteId);
  setStatus("Saved","ok"); noteData.title = t; noteData.body = b;
  if (!searchQuery) renderSidebar();
}
async function delAction() {
  if (!currentNoteId) return;
  if (await showConfirm("Delete permanently?")) { await removeNote(currentNoteId); persistNoteId(null); noteData = null; await loadData(); renderSidebar(); renderEditor(); }
}
async function shareAction() {
  if (!noteData) return;
  const n = noteData;
  const token = n.shareToken;
  const shareUrl = token ? `${location.origin}#/s/${token}` : "";
  const expiresIn = n.shareExpiresAt ? Math.round((new Date(n.shareExpiresAt).getTime() - Date.now()) / 1000) : 0;
  const html = `<div class="share-panel"><h3>Share note</h3>
    <div class="share-section"><label class="share-label"><i data-lucide="eye" style="width:14px;height:14px"></i> Visibility</label><select id="sp-vis"><option value="PRIVATE" ${n.visibility==="PRIVATE"?"selected":""}>Private</option><option value="LINK" ${n.visibility==="LINK"?"selected":""}>Anyone with link</option><option value="PUBLIC" ${n.visibility==="PUBLIC"?"selected":""}>Public</option></select></div>
    <div class="share-section"><label class="share-label"><i data-lucide="clock" style="width:14px;height:14px"></i> Expire after</label><select id="sp-exp"><option value="0" ${!expiresIn?"selected":""}>Never</option><option value="3600" ${expiresIn===3600?"selected":""}>1 hour</option><option value="86400" ${expiresIn===86400?"selected":""}>24 hours</option><option value="604800" ${expiresIn===604800?"selected":""}>7 days</option></select></div>
    <div class="share-section"><label class="share-label"><i data-lucide="lock" style="width:14px;height:14px"></i> Password</label><input id="sp-pw" type="password" placeholder="none" value="${n.sharePassword||""}"></div>
    <div class="share-section"><label class="share-label"><i data-lucide="eye" style="width:14px;height:14px"></i> Max views (0 = unlimited)</label><input id="sp-mv" type="number" min="0" value="${n.maxViews||0}"></div>
    ${token ? `<div class="share-section" style="font-size:.8125rem;color:var(--muted)">Views: ${n.viewCount||0}${n.maxViews?" / "+n.maxViews:""}</div><div class="share-actions"><button class="ghost" id="sp-copy"><i data-lucide="copy" style="width:14px;height:14px"></i> Copy link</button><button class="danger" id="sp-revoke"><i data-lucide="x" style="width:14px;height:14px"></i> Revoke</button></div>` : ""}
    <div class="share-actions" style="margin-top:.75rem"><button id="modal-cancel" class="ghost">Cancel</button><button class="primary" id="sp-save">${token ? "Update" : "Generate link"}</button></div></div>`;
  showModalPanel(html).then(async r => {
    if (!r || r === "cancel") return;
    if (r === "revoke") { await api(`/api/notes/${currentNoteId}/revoke`,{method:"POST"}); noteData = await fetchNote(currentNoteId!); if (noteData) setStatus("Revoked","ok"); return; }
    if (r === "copy" && shareUrl) { await navigator.clipboard.writeText(shareUrl).catch(() => {}); showMsg("Copied"); return; }
    const vis = (document.getElementById("sp-vis") as HTMLSelectElement)?.value || "PRIVATE";
    const exp = parseInt((document.getElementById("sp-exp") as HTMLSelectElement)?.value || "0", 10);
    const pw = (document.getElementById("sp-pw") as HTMLInputElement)?.value || "";
    const mv = parseInt((document.getElementById("sp-mv") as HTMLInputElement)?.value || "0", 10);
    noteData = await setShare(currentNoteId!, vis, exp, pw, mv || 0);
    setStatus(noteData.visibility + (noteData.shareToken ? " · s/"+noteData.shareToken : ""), "ok");
  });
}
function showModalPanel(html: string): Promise<string|null> {
  return new Promise(r => { modalResolve = r; modalActive = true;
    document.getElementById("modal-content")!.innerHTML = html; document.getElementById("modal")!.classList.add("open"); renderIcons();
    document.querySelector("#modal-cancel")?.addEventListener("click", () => { closeModal(); r("cancel"); });
    document.querySelector("#sp-save")?.addEventListener("click", () => { closeModal(); r("save"); });
    document.querySelector("#sp-copy")?.addEventListener("click", () => { closeModal(); r("copy"); });
    document.querySelector("#sp-revoke")?.addEventListener("click", async () => { if (await showConfirm("Revoke?")) { closeModal(); r("revoke"); } });
  });
}
async function folderAction() {
  if (!noteData) return;
  const f = await showInput("Folder name", { value: noteData.folder||"", placeholder: "name" });
  if (f === null) return;
  const v = f.trim() || null; await saveNote(currentNoteId!, { folder: v }); noteData.folder = v;
  document.getElementById("n-folder-label")!.textContent = v || "none"; await loadData(); renderSidebar();
}
async function tagsAction() {
  if (!noteData) return;
  const t = await showInput("Tags (comma separated)", { value: (noteData.tags||[]).join(", ") });
  if (t === null) return;
  const tags = t.split(",").map((s: string) => s.trim()).filter(Boolean);
  await saveNote(currentNoteId!, { tags }); noteData.tags = tags; document.getElementById("n-tag-label")!.textContent = tags.length + " tags";
}
async function newNoteAction() {
  const t = await showInput("Title", { value: "Untitled" });
  if (!t?.trim()) return;
  const note = await newNote(t.trim());
  if (note) { persistNoteId(note.id); noteData = note; await loadData(); renderSidebar(); renderEditor(); }
}

// ── Sidebar ──
function openSidebar() { document.getElementById("sidebar")!.classList.add("open"); document.getElementById("overlay")!.classList.add("open"); }
function closeSidebar() { document.getElementById("sidebar")!.classList.remove("open"); document.getElementById("overlay")!.classList.remove("open"); }

window.addEventListener("keydown", e => { if ((e.metaKey||e.ctrlKey) && e.key === "s") { e.preventDefault(); saveAction(); } });
window.addEventListener("beforeunload", e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

async function init() {
  if (!(await loadData())) {
    document.getElementById("app")!.innerHTML = `<div class="auth-wrap"><div class="auth-card"><h1>Sign in</h1><p class="sub">Session cookie.</p><form id="lf"><label><span>Email</span><input name="email" type="email" value="paulo@local"></label><label><span>Password</span><input name="password" type="password"></label><p id="lerr" style="color:var(--danger);display:none"></p><button type="submit">Continue</button></form></div></div>`;
    document.getElementById("lf")?.addEventListener("submit", async e => { e.preventDefault(); const fd = new FormData(e.target as HTMLFormElement); const r = await login(String(fd.get("email")), String(fd.get("password"))); if (!r.ok) { const el = document.getElementById("lerr"); if (el) { el.textContent = "Wrong."; el.style.display = ""; } return; } init(); });
    renderIcons(); return;
  }
  document.getElementById("app")!.innerHTML = `
    <div class="sidebar-overlay" id="overlay"></div>
    <div class="app-layout">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-head">
          <button class="ghost mobile-only" id="sb-close" aria-label="Close sidebar" title="Close sidebar"><i data-lucide="x" style="width:18px;height:18px"></i></button>
          <h1>Notes</h1>
          <button class="ghost" id="theme-btn" aria-label="Toggle theme" title="Toggle theme"><i data-lucide="moon" style="width:18px;height:18px"></i></button>
          <button id="new-btn" aria-label="New note" title="New note"><i data-lucide="plus" style="width:18px;height:18px"></i></button>
        </div>
        <div class="sidebar-search" style="display:flex;align-items:center;gap:.35rem;padding:.5rem .6rem;border-bottom:1px solid var(--line)">
          <i data-lucide="search" style="width:14px;height:14px;color:var(--muted);flex-shrink:0"></i>
          <input id="sq" type="search" placeholder="Search" style="flex:1;background:var(--paper);border:1px solid var(--line);border-radius:var(--radius-sm);padding:.35rem .6rem;font-size:.8125rem;width:100%">
        </div>
        <nav class="sidebar-nav" id="sidebar-nav" style="flex:1;overflow-y:auto"></nav>
        <div id="backlinks-panel" style="display:none;border-top:1px solid var(--line);background:var(--panel-deep);padding:.5rem .75rem;max-height:30vh;overflow-y:auto"></div>
      </aside>
      <main class="main-area" id="main-area"></main>
    </div>
    <div id="modal" class="dialog-overlay"><div class="dialog-panel" id="modal-content"></div></div>`;
  renderIcons();
  document.getElementById("overlay")?.addEventListener("click", closeSidebar);
  bind("#sb-close","click", closeSidebar);
  bind("#theme-btn","click", () => { const l = document.documentElement.className === "light"; document.documentElement.className = l ? "" : "light"; localStorage.setItem("notes-theme", l ? "dark" : "light"); renderIcons(); });
  bind("#new-btn","click", newNoteAction);
  bind("#sq","input", () => { searchQuery = ($("#sq") as HTMLInputElement).value; renderSidebar(); });
  renderSidebar();
  if (currentNoteId) { const note = await fetchNote(currentNoteId); if (note) { noteData = note; renderEditor(); loadBacklinks(currentNoteId); } else { persistNoteId(null); renderEditor(); } }
  else renderEditor();
  if (window.innerWidth <= 800) openSidebar();
}

document.addEventListener("DOMContentLoaded", init);
