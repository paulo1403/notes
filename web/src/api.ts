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
