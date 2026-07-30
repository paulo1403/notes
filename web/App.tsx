import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { marked } from 'marked'
import { useStore } from './store'
import * as api from './api'
import {
  Search, Plus, Pin, PinOff, Sun, Moon, LogOut, Menu, X,
  Folder, FolderOpen, FileText, Trash2, Share2, Save,
  Loader2, List, Grid3X3, Eye, EyeOff, ChevronDown, ChevronRight,
  Clock, Copy, ExternalLink,
} from 'lucide-react'

type Note = api.Note
type Folder = api.Folder

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) })

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

const renderMd = (text: string) => marked.parse(text, { async: false }) as string

function ThemeSync() {
  const theme = useStore(s => s.theme)
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme) }, [theme])
  return null
}

const LoginPage = ({ onBack, onLogin }: { onBack: () => void; onLogin: (u: unknown) => void }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm({ resolver: zodResolver(loginSchema) })
  const onSubmit = useCallback(async (data: z.infer<typeof loginSchema>) => {
    try {
      const result = await api.login(data.email, data.password)
      onLogin(result.user)
    } catch (e) {
      setError('root', { message: e instanceof Error ? e.message : 'Login failed' })
    }
  }, [onLogin, setError])
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100 p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="card bg-base-200 w-full max-w-sm p-6 space-y-4">
        <button type="button" className="btn btn-ghost btn-sm self-start -ml-2 -mt-2 gap-1" onClick={onBack}>
          <ChevronRight className="rotate-180 size-3" /> Back
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="text-sm text-base-content/60">Enter your credentials</p>
        <fieldset className="fieldset">
          <legend className="fieldset-legend text-xs">Email</legend>
          <input type="email" className="input w-full" {...register('email')} autoFocus />
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend text-xs">Password</legend>
          <input type="password" className="input w-full" {...register('password')} />
        </fieldset>
        {errors.root && <p className="text-error text-sm">{errors.root.message}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Sign in
        </button>
      </form>
    </div>
  )
}

const LandingPage = ({ onLogin }: { onLogin: () => void }) => (
  <div className="hero min-h-screen bg-base-100">
    <div className="hero-content text-center">
      <div className="max-w-md flex flex-col items-center gap-4">
        <FileText className="size-16 opacity-30" />
        <h1 className="text-4xl font-bold tracking-tight">Notes</h1>
        <p className="text-base-content/60 max-w-sm">Markdown notes with auth, share links, and attachments</p>
        <button className="btn btn-primary btn-wide" onClick={onLogin}>Sign in</button>
      </div>
    </div>
  </div>
)

const NewFolderDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const create = useMutation({
    mutationFn: () => api.createFolder(name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['folders'] }); setName(''); onClose() },
  })
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (!ref.current) return
    open ? ref.current.showModal() : ref.current.close()
  }, [open])
  useEffect(() => { if (open) setName('') }, [open])
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (name.trim()) create.mutate() }
  return (
    <dialog ref={ref} className="modal" onClose={onClose}>
      <div className="modal-box">
        <form method="dialog"><button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"><X className="size-4" /></button></form>
        <h3 className="font-bold text-lg mb-4">New Folder</h3>
        <form onSubmit={handleSubmit}>
          <input className="input input-bordered w-full mb-4" placeholder="Folder name" value={name} onChange={e => setName(e.target.value)} autoFocus />
          <div className="modal-action"><button type="submit" className="btn btn-primary" disabled={!name.trim() || create.isPending}>Create</button></div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop"><button>close</button></form>
    </dialog>
  )
}

const ShareDialog = ({ noteId, open, onClose }: { noteId: string; open: boolean; onClose: () => void }) => {
  const [shareLink, setShareLink] = useState<api.ShareLink | null>(null)
  const [expiresIn, setExpiresIn] = useState('')
  const createShare = useMutation({
    mutationFn: () => api.createShareLink(noteId, expiresIn ? { expiresIn } : undefined),
    onSuccess: setShareLink,
  })
  const deleteShare = useMutation({
    mutationFn: () => shareLink ? api.deleteShareLink(shareLink.token) : Promise.resolve(),
    onSuccess: () => setShareLink(null),
  })
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (!ref.current) return
    open ? ref.current.showModal() : (ref.current.close(), setShareLink(null))
  }, [open])
  useEffect(() => { if (open) { setShareLink(null); setExpiresIn('') } }, [open])
  const copyLink = () => { if (shareLink) navigator.clipboard.writeText(`${location.origin}/share/${shareLink.token}`) }
  return (
    <dialog ref={ref} className="modal" onClose={onClose}>
      <div className="modal-box">
        <form method="dialog"><button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"><X className="size-4" /></button></form>
        <h3 className="font-bold text-lg mb-4">Share Note</h3>
        {shareLink ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-2 bg-base-300 rounded-lg">
              <input className="input input-ghost flex-1 text-sm" readOnly value={`${location.origin}/share/${shareLink.token}`} />
              <button className="btn btn-ghost btn-sm btn-square" onClick={copyLink} title="Copy link"><Copy className="size-4" /></button>
            </div>
            {shareLink.expiresAt && <p className="text-xs text-base-content/50">Expires {new Date(shareLink.expiresAt).toLocaleString()}</p>}
            <button className="btn btn-ghost btn-sm text-error" onClick={() => deleteShare.mutate()}>Remove share link</button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-base-content/60">Create a shareable link for this note.</p>
            <select className="select select-bordered w-full" value={expiresIn} onChange={e => setExpiresIn(e.target.value)}>
              <option value="">Never expires</option>
              <option value="1h">1 hour</option>
              <option value="24h">24 hours</option>
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
            </select>
            <button className="btn btn-primary" onClick={() => createShare.mutate()} disabled={createShare.isPending}>
              {createShare.isPending ? <Loader2 className="size-4 animate-spin" /> : <Link className="size-4" />}
              Create share link
            </button>
          </div>
        )}
        {createShare.error && <p className="text-error text-sm mt-2">{(createShare.error as Error).message}</p>}
      </div>
      <form method="dialog" className="modal-backdrop"><button>close</button></form>
    </dialog>
  )
}

const ConfirmDialog = ({ open, title, message, confirmLabel, onConfirm, onClose }: { open: boolean; title: string; message: string; confirmLabel?: string; onConfirm: () => void; onClose: () => void }) => {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (!ref.current) return
    open ? ref.current.showModal() : ref.current.close()
  }, [open])
  return (
    <dialog ref={ref} className="modal" onClose={onClose}>
      <div className="modal-box">
        <form method="dialog"><button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"><X className="size-4" /></button></form>
        <h3 className="font-bold text-lg mb-2">{title}</h3>
        <p className="text-base-content/60 text-sm mb-4">{message}</p>
        <div className="modal-action"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-error" onClick={onConfirm}>{confirmLabel || 'Delete'}</button></div>
      </div>
      <form method="dialog" className="modal-backdrop"><button>close</button></form>
    </dialog>
  )
}

const NoteListItem = ({ note, active, onClick }: { note: Note; active: boolean; onClick: () => void }) => {
  const updated = useMemo(() => {
    const d = new Date(note.updatedAt)
    const now = Date.now()
    const diff = now - d.getTime()
    if (diff < 60000) return 'now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    return d.toLocaleDateString()
  }, [note.updatedAt])
  return (
    <button className={`flex items-start gap-2 w-full text-left p-2 rounded-lg text-sm transition-colors ${active ? 'bg-primary/10 text-primary' : 'hover:bg-base-300'}`} onClick={onClick}>
      {note.pinned && <Pin className="size-3 mt-1 shrink-0" />}
      {!note.pinned && <FileText className="size-3 mt-1 shrink-0 text-base-content/40" />}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{note.title || 'Untitled'}</div>
        <div className="text-xs text-base-content/40 flex items-center gap-1">
          <Clock className="size-3" /> {updated}
        </div>
      </div>
    </button>
  )
}

const SidebarContent = ({ selectedNoteId, onSelectNote, onNewFolder }: { selectedNoteId: string | null; onSelectNote: (id: string) => void; onNewFolder: () => void }) => {
  const { data: folders } = useQuery({ queryKey: ['folders'], queryFn: api.getFolders })
  const { data: notes } = useQuery({ queryKey: ['notes'], queryFn: () => api.getNotes() })
  const { activeFolderId, setActiveFolderId, searchQuery, setSearchQuery, theme, toggleTheme } = useStore()
  const qc = useQueryClient()
  const logout = useMutation({ mutationFn: api.logout, onSuccess: () => { qc.clear(); window.location.reload() } })
  const createNote = useMutation({
    mutationFn: () => api.createNote(),
    onSuccess: (n) => { qc.invalidateQueries({ queryKey: ['notes'] }); onSelectNote(n.id) },
  })
  const delFolder = useMutation({
    mutationFn: () => activeFolderId ? api.deleteFolder(activeFolderId) : Promise.resolve(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['folders'] }); setActiveFolderId(null) },
  })
  const debouncedSearch = useDebounce(searchQuery, 200)

  const filtered = useMemo(() => {
    if (!notes) return []
    let list = activeFolderId ? notes.filter(n => n.folderId === activeFolderId) : notes
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      list = list.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
    }
    return list
  }, [notes, activeFolderId, debouncedSearch])

  const { pinned, unpinned } = useMemo(() => {
    const p = filtered.filter(n => n.pinned), u = filtered.filter(n => !n.pinned)
    return { pinned: p, unpinned: u }
  }, [filtered])

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-base-300">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">Notes</h1>
          </div>
          <div className="flex gap-1">
            <button className="btn btn-ghost btn-xs btn-square" onClick={toggleTheme}>{theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}</button>
            <button className="btn btn-ghost btn-xs btn-square" onClick={() => logout.mutate()}><LogOut className="size-3.5" /></button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-base-content/40 pointer-events-none" />
          <input className="input input-sm w-full pl-7" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
      </div>

      <div className="border-b border-base-300">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Folders</span>
          <button className="btn btn-ghost btn-xs btn-square" onClick={onNewFolder}><Plus className="size-3.5" /></button>
        </div>
        <div className="menu menu-sm px-2 pb-2">
          <li><a className={!activeFolderId ? 'active' : ''} onClick={() => setActiveFolderId(null)}><Folder className="size-4" />All Notes</a></li>
          {folders?.map(f => (
            <li key={f.id} className="group">
              <a className={activeFolderId === f.id ? 'active' : ''} onClick={() => setActiveFolderId(f.id)}>
                <FolderOpen className="size-4" /><span className="flex-1">{f.name}</span>
                <span className="badge badge-ghost badge-xs">{f.noteCount}</span>
                {activeFolderId === f.id && <Trash2 className="size-3 text-error opacity-0 group-hover:opacity-100" onClick={() => delFolder.mutate()} />}
              </a>
            </li>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Notes</span>
          <button className="btn btn-ghost btn-xs btn-square" onClick={() => createNote.mutate()}><Plus className="size-3.5" /></button>
        </div>
        {pinned.length > 0 && (
          <div className="px-2 mb-1">
            <div className="px-2 py-1 text-xs text-base-content/40 flex items-center gap-1"><Pin className="size-3" />Pinned</div>
            {pinned.map(n => <NoteListItem key={n.id} note={n} active={n.id === selectedNoteId} onClick={() => onSelectNote(n.id)} />)}
          </div>
        )}
        <div className="px-2">
          {unpinned.map(n => <NoteListItem key={n.id} note={n} active={n.id === selectedNoteId} onClick={() => onSelectNote(n.id)} />)}
        </div>
        {filtered.length === 0 && <div className="text-center text-base-content/40 text-sm py-8">{debouncedSearch ? 'No results' : 'No notes'}</div>}
      </div>
    </div>
  )
}

function App() {
  const [auth, setAuth] = useState<'loading' | 'landing' | 'login' | 'app'>('loading')
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ type: 'note' | 'folder'; id: string } | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const drawerToggle = useRef<HTMLInputElement>(null)

  const closeSidebar = useCallback(() => { if (drawerToggle.current) drawerToggle.current.checked = false }, [])

  const qc = useQueryClient()
  const { view, setView, setSearchQuery } = useStore()

  useEffect(() => {
    api.checkSession().then(ok => setAuth(ok ? 'app' : 'landing')).catch(() => setAuth('landing'))
  }, [])

  const { data: notes } = useQuery({ queryKey: ['notes'], queryFn: () => api.getNotes(), enabled: auth === 'app' })
  const { data: folders } = useQuery({ queryKey: ['folders'], queryFn: api.getFolders, enabled: auth === 'app' })

  const selectedNote = useMemo(() => notes?.find(n => n.id === selectedNoteId) ?? null, [notes, selectedNoteId])

  const [draftTitle, setDraftTitle] = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (selectedNote) {
      setDraftTitle(selectedNote.title)
      setDraftContent(selectedNote.content)
      setIsDirty(false)
    }
  }, [selectedNoteId])

  const saveMutation = useMutation({
    mutationFn: (data: { title?: string; content?: string }) => api.updateNote(selectedNoteId!, data),
    onSuccess: () => { setIsDirty(false); qc.invalidateQueries({ queryKey: ['notes'] }) },
  })

  const pinMutation = useMutation({
    mutationFn: () => api.updateNote(selectedNoteId!, { pinned: !selectedNote?.pinned }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteNote(selectedNoteId!),
    onSuccess: () => { setSelectedNoteId(null); qc.invalidateQueries({ queryKey: ['notes'] }) },
  })

  const createNote = useMutation({
    mutationFn: () => api.createNote(),
    onSuccess: (n) => { setSelectedNoteId(n.id); qc.invalidateQueries({ queryKey: ['notes'] }) },
  })

  const handleSave = useCallback(() => {
    if (!selectedNoteId || !isDirty) return
    saveMutation.mutate({ title: draftTitle, content: draftContent })
  }, [selectedNoteId, isDirty, draftTitle, draftContent, saveMutation])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') { (e.target as HTMLElement).blur(); return }
        if (e.key === 's' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSave(); return }
        return
      }
      if (e.key === 'Escape') { setSearchQuery(''); return }
      if (e.key === 'n' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); createNote.mutate(); return }
      if (e.key === 's' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSave(); return }
      if (e.key === '/' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setSearchQuery(s => s ? '' : '/') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave, createNote, setSearchQuery])

  if (auth === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-base-100">
      <Loader2 className="size-8 animate-spin text-primary" />
    </div>
  )

  if (auth === 'landing') return <LandingPage onLogin={() => setAuth('login')} />
  if (auth === 'login') return <LoginPage onBack={() => setAuth('landing')} onLogin={() => setAuth('app')} />

  const sidebarContent = <SidebarContent selectedNoteId={selectedNoteId} onSelectNote={(id) => { setSelectedNoteId(id); closeSidebar() }} onNewFolder={() => setFolderDialogOpen(true)} />

  return (
    <>
      <ThemeSync />
      <div className="drawer lg:drawer-open">
        <input ref={drawerToggle} id="sidebar" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content flex flex-col min-h-screen">
          <div className="navbar bg-base-100 border-b border-base-300 min-h-12 px-2 gap-1">
            <label htmlFor="sidebar" className="btn btn-ghost btn-sm btn-square lg:hidden"><Menu className="size-4" /></label>
            <div className="flex-1 min-w-0">
              {selectedNote ? (
                <span className="truncate text-sm font-medium">{selectedNote.title || 'Untitled'}</span>
              ) : (
                <span className="text-sm text-base-content/40">Select a note</span>
              )}
            </div>
            {selectedNote && (
              <div className="flex items-center gap-0.5">
                <button className="btn btn-ghost btn-sm btn-square" onClick={() => pinMutation.mutate()} title="Pin">
                  {selectedNote.pinned ? <Pin className="size-4 text-primary" /> : <PinOff className="size-4" />}
                </button>
                <div className="flex items-center gap-0.5 join">
                  <button className={`btn btn-ghost btn-xs join-item ${view === 'list' ? 'bg-base-300' : ''}`} onClick={() => setView('list')} title="List view"><List className="size-3.5" /></button>
                  <button className={`btn btn-ghost btn-xs join-item ${view === 'card' ? 'bg-base-300' : ''}`} onClick={() => setView('card')} title="Card view"><Grid3X3 className="size-3.5" /></button>
                </div>
                <button className="btn btn-ghost btn-sm btn-square" onClick={() => setPreviewMode(p => !p)} title="Toggle preview">
                  {previewMode ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </button>
                <button className="btn btn-ghost btn-sm btn-square" onClick={() => setShareDialogOpen(true)} title="Share"><Share2 className="size-4" /></button>
                <button className="btn btn-ghost btn-sm btn-square text-error" onClick={() => setDeleteDialog({ type: 'note', id: selectedNoteId! })} title="Delete"><Trash2 className="size-4" /></button>
                <button className={`btn btn-sm btn-primary ${isDirty ? 'animate-pulse' : ''}`} onClick={handleSave} disabled={!isDirty || saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                  Save
                </button>
              </div>
            )}
          </div>

          <main className="flex-1 flex flex-col overflow-hidden">
            {selectedNote ? (
              <div className="flex-1 flex flex-col lg:flex-row">
                <div className={`flex-1 flex flex-col ${previewMode ? 'hidden lg:flex' : ''}`}>
                  <div className="p-4 pb-0">
                    <input className="input input-ghost text-xl font-bold tracking-tight w-full px-0" placeholder="Note title" value={draftTitle} onChange={e => { setDraftTitle(e.target.value); setIsDirty(true) }} />
                  </div>
                  <div className="flex-1 p-4 pt-2">
                    <textarea className="textarea textarea-ghost w-full h-full font-mono text-sm resize-none p-0" placeholder="Write in markdown..." value={draftContent} onChange={e => { setDraftContent(e.target.value); setIsDirty(true) }} />
                  </div>
                </div>
                <div className={`flex-1 border-t lg:border-t-0 lg:border-l border-base-300 overflow-y-auto p-4 bg-base-200/50 ${!previewMode ? 'hidden lg:block' : ''}`}>
                  <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMd(draftContent || '*Empty*') }} />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col p-4 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold tracking-tight">All Notes</h2>
                  <button className="btn btn-primary btn-sm" onClick={() => createNote.mutate()}><Plus className="size-4" />New Note</button>
                </div>
                {!notes ? (
                  <div className="flex-1 flex items-center justify-center"><Loader2 className="size-6 animate-spin text-base-content/30" /></div>
                ) : notes.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 text-base-content/40">
                    <FileText className="size-12 opacity-30" />
                    <p className="text-sm">No notes yet. Create your first note.</p>
                  </div>
                ) : (
                  <div className={`grid gap-3 ${view === 'card' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                    {notes.map(n => (
                      <button key={n.id} className={`card bg-base-200 hover:bg-base-300 transition-colors text-left ${view === 'card' ? 'p-4' : 'p-3 flex-row items-center gap-3'}`} onClick={() => setSelectedNoteId(n.id)}>
                        {view === 'card' ? (
                          <>
                            <div className="flex items-start gap-2 mb-2">
                              {n.pinned && <Pin className="size-3 text-primary mt-1 shrink-0" />}
                              <h3 className="font-semibold truncate text-sm">{n.title || 'Untitled'}</h3>
                            </div>
                            <p className="text-xs text-base-content/50 line-clamp-3">{n.content || 'No content'}</p>
                            <div className="text-xs text-base-content/30 mt-2">{new Date(n.updatedAt).toLocaleDateString()}</div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {n.pinned && <Pin className="size-3 text-primary shrink-0" />}
                              <span className="font-medium truncate text-sm">{n.title || 'Untitled'}</span>
                            </div>
                            <span className="text-xs text-base-content/40 shrink-0">{new Date(n.updatedAt).toLocaleDateString()}</span>
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>

        <div className="drawer-side z-40">
          <label htmlFor="sidebar" className="drawer-overlay"></label>
          <aside className="bg-base-200 w-72 min-h-full flex flex-col border-r border-base-300">
            {sidebarContent}
          </aside>
        </div>
      </div>

      <NewFolderDialog open={folderDialogOpen} onClose={() => setFolderDialogOpen(false)} />
      <ShareDialog noteId={selectedNoteId || ''} open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} />
      <ConfirmDialog
        open={!!deleteDialog}
        title={deleteDialog?.type === 'note' ? 'Delete Note' : 'Delete Folder'}
        message={deleteDialog?.type === 'note' ? 'Delete this note permanently?' : 'Delete this folder and all its notes?'}
        onConfirm={() => {
          if (deleteDialog?.type === 'note') deleteMutation.mutate()
          setDeleteDialog(null)
        }}
        onClose={() => setDeleteDialog(null)}
      />
    </>
  )
}

export default App
