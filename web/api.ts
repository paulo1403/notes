import { z } from 'zod'

const TokenSchema = z.string().min(1)
const token = () => localStorage.getItem('token')

let storedToken = localStorage.getItem('token')
export function setToken(t: string | null) {
  if (t) { localStorage.setItem('token', t); storedToken = t }
  else { localStorage.removeItem('token'); storedToken = null }
}
export function getToken() { return storedToken }

export const NoteSchema = z.object({
  id: z.string(),
  title: z.string().default(''),
  content: z.string().default(''),
  folderId: z.string().nullable(),
  pinned: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Note = z.infer<typeof NoteSchema>

export const FolderSchema = z.object({
  id: z.string(),
  name: z.string(),
  noteCount: z.number().default(0),
})
export type Folder = z.infer<typeof FolderSchema>

export const AttachmentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  size: z.number(),
  url: z.string(),
})
export type Attachment = z.infer<typeof AttachmentSchema>

export const ShareLinkSchema = z.object({
  token: z.string(),
  expiresAt: z.string().nullable(),
  requiresEmail: z.boolean().default(false),
})
export type ShareLink = z.infer<typeof ShareLinkSchema>

const UserSchema = z.object({ id: z.string(), email: z.string(), name: z.string().optional() })

async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const t = getToken()
  const res = await fetch(path, {
    ...opts,
    headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}), ...opts.headers } as Record<string, string>,
  })
  if (res.status === 401) { setToken(null); throw new Error('Session expired') }
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export async function login(email: string, password: string) {
  const data = await api<{ token: string; user: z.infer<typeof UserSchema> }>('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  setToken(data.token)
  return data
}

export async function logout() { try { await api('/api/logout') } finally { setToken(null) } }

export async function checkSession() {
  const data = await api<{ ok: boolean }>('/api/session')
  return data.ok
}

const FoldersResponse = z.object({ folders: z.array(FolderSchema) }).transform(d => d.folders)
export async function getFolders() { return FoldersResponse.parse(await api('/api/folders')) }

export async function createFolder(name: string) { return api<Folder>('/api/folders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }) }

export async function deleteFolder(id: string) { return api(`/api/folders/${id}`, { method: 'DELETE' }) }

export async function getNotes(folderId?: string | null) {
  const params = folderId ? `?folderId=${folderId}` : ''
  return api<Note[]>(`/api/notes${params}`)
}

export async function getNote(id: string) { return api<Note>(`/api/notes/${id}`) }

export async function createNote(title?: string) { return api<Note>('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title || 'Untitled' }) }) }

const UpdateNoteInput = z.object({ title: z.string().optional(), content: z.string().optional(), folderId: z.string().nullable().optional(), pinned: z.boolean().optional() })
export async function updateNote(id: string, data: z.input<typeof UpdateNoteInput>) { return api<Note>(`/api/notes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(UpdateNoteInput.parse(data)) }) }

export async function deleteNote(id: string) { return api(`/api/notes/${id}`, { method: 'DELETE' }) }

export async function createShareLink(noteId: string, opts?: { expiresIn?: string; requireEmail?: boolean }) { return api<ShareLink>(`/api/notes/${noteId}/share`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(opts || {}) }) }

export async function deleteShareLink(token: string) { return api(`/api/share/${token}`, { method: 'DELETE' }) }

export async function uploadAttachment(noteId: string, file: File) {
  const form = new FormData(); form.append('file', file)
  return api<Attachment>(`/api/notes/${noteId}/attachments`, { method: 'POST', body: form })
}

export async function deleteAttachment(noteId: string, attachmentId: string) { return api(`/api/notes/${noteId}/attachments/${attachmentId}`, { method: 'DELETE' }) }
