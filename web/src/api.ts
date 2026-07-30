export type NoteListItem = {
  id: string; title: string; slug: string; folder: string | null
  visibility: 'PRIVATE' | 'LINK' | 'PUBLIC'; shareToken: string | null
  shareExpiresAt: string | null; maxViews: number | null; viewCount: number
  tags: string[]; createdAt: string; updatedAt: string
}
export type NoteShare = { id: string; permission: string; createdAt: string; user: { id: string; email: string; name: string; avatar: string | null } }
export type NoteDetail = NoteListItem & { body: string; attachments: Attachment[]; shares?: NoteShare[] }
export type FolderInfo = { name: string; count: number }
export type Attachment = { id: string; key: string; filename: string; mimeType: string; size: number }
export type User = { id: string; email: string; name: string; role: string; avatar?: string | null }
export type Profile = { id: string; email: string; name: string; role: string; bio?: string | null; avatar?: string | null }
export type AdminUser = { id: string; email: string; name: string; role: string; bio?: string | null; createdAt: string; noteCount: number }

async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { credentials: 'include', ...opts, headers: { ...(opts.headers || {}), ...(opts.body && typeof opts.body === 'string' ? { 'Content-Type': 'application/json' } : {}) } as Record<string, string> })
  if (res.status === 401) throw new Error('Session expired')
  if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

export async function login(email: string, password: string) {
  const d = await api<{ user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  return d.user
}
export async function register(email: string, password: string, name?: string) {
  const d = await api<{ user: User }>('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) })
  return d.user
}
export async function logout() { await api('/api/auth/logout', { method: 'POST' }) }
export async function checkSession() { const d = await api<{ user: User }>('/api/auth/me'); return d.user }
export async function getNotes(q?: string) { const d = await api<{ notes: NoteListItem[] }>(`/api/notes${q ? `?q=${encodeURIComponent(q)}` : ''}`); return d.notes }
export async function getNote(id: string) { const d = await api<{ note: NoteDetail }>(`/api/notes/${id}`); return d.note }
export async function createNote(title: string, folder?: string) { const d = await api<{ note: NoteDetail }>('/api/notes', { method: 'POST', body: JSON.stringify({ title, folder }) }); return d.note }
export async function updateNote(id: string, data: { title?: string; body?: string; folder?: string | null; tags?: string[] }) { const d = await api<{ note: NoteDetail }>(`/api/notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); return d.note }
export async function deleteNote(id: string) { await api(`/api/notes/${id}`, { method: 'DELETE' }) }
export async function getFolders() { const d = await api<{ folders: FolderInfo[] }>('/api/folders'); return d.folders }
export async function shareNote(noteId: string, payload: { visibility: 'PRIVATE' | 'LINK' | 'PUBLIC'; expiresIn?: number; password?: string; maxViews?: number }) { const d = await api<{ note: NoteDetail }>(`/api/notes/${noteId}/share`, { method: 'POST', body: JSON.stringify(payload) }); return d.note }
export async function revokeShare(noteId: string) { await api(`/api/notes/${noteId}/revoke`, { method: 'POST' }) }
export async function uploadAttachment(noteId: string, file: File) {
  const form = new FormData(); form.append('file', file)
  const res = await fetch(`/api/notes/${noteId}/attachments`, { method: 'POST', credentials: 'include', body: form })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ attachment: Attachment; url: string }>
}
export async function getAttachmentUrl(id: string) { const d = await api<{ url: string }>(`/api/attachments/${id}/url`); return d.url }
export async function searchUsers(q: string) { const d = await api<{ users: { id: string; email: string; name: string; avatar: string | null }[] }>(`/api/users/search?q=${encodeURIComponent(q)}`); return d.users }
export async function shareWithUsers(noteId: string, userIds: string[], permission?: string) { await api(`/api/notes/${noteId}/shares`, { method: 'POST', body: JSON.stringify({ userIds, permission }) }) }
export async function removeUserShare(noteId: string, userId: string) { await api(`/api/notes/${noteId}/shares/${userId}`, { method: 'DELETE' }) }
export async function getProfile() { const d = await api<{ profile: Profile }>('/api/auth/profile'); return d.profile }
export async function updateProfile(data: { name?: string; bio?: string }) { const d = await api<{ profile: Profile }>('/api/auth/profile', { method: 'PATCH', body: JSON.stringify(data) }); return d.profile }
export async function uploadAvatar(file: File) {
  const form = new FormData(); form.append('file', file)
  const res = await fetch('/api/auth/profile/photo', { method: 'POST', credentials: 'include', body: form })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as { avatar: string }
}
export async function getAdminUsers() { const d = await api<{ users: AdminUser[] }>('/api/admin/users'); return d.users }
export async function updateAdminUser(id: string, data: { name?: string; password?: string; role?: string }) { const d = await api<{ user: User }>(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); return d.user }
export async function deleteAdminUser(id: string) { await api(`/api/admin/users/${id}`, { method: 'DELETE' }) }
