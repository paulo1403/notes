import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { marked } from 'marked'
import { Loader2, FileText, Plus, Menu, List, Grid3X3, Eye, EyeOff, Share2, Trash2, Save, Copy } from 'lucide-react'
import * as api from './api'
import { useStore } from './store'
import { ThemeSync } from './components/ThemeSync'
import { LandingPage } from './components/LandingPage'
import { LoginPage } from './components/LoginPage'
import { ShareDialog } from './components/ShareDialog'
import { ConfirmDialog } from './components/ConfirmDialog'
import { SidebarContent } from './components/SidebarContent'
import { SettingsPage } from './components/SettingsPage'
import { AdminPage } from './components/SettingsPage'
import { useInsertMarkdown } from './hooks/useInsertMarkdown'
import { useAutoSave } from './hooks/useAutoSave'

function App() {
  const [auth, setAuth] = useState<'loading' | 'landing' | 'login' | 'app'>('loading')
  const [user, setUser] = useState<api.User | null>(null)
  const [page, setPage] = useState<'app' | 'settings' | 'admin'>('app')
  const selectedNoteId = useStore(s => s.selectedNoteId)
  const setSelectedNoteId = useStore(s => s.setSelectedNoteId)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const drawerToggle = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const insertMarkdown = useInsertMarkdown(textareaRef)
  const closeSidebar = useCallback(() => { if (drawerToggle.current) drawerToggle.current.checked = false }, [])
  const qc = useQueryClient()
  const { view, setView, activeFolder, showShared } = useStore()

  useEffect(() => {
    api.checkSession().then(u => { setUser(u); setAuth('app') }).catch(() => setAuth('landing'))
  }, [])

  const { data: notes } = useQuery({ queryKey: ['notes', activeFolder], queryFn: () => api.getNotes(), enabled: auth === 'app' })
  const { data: noteDetail } = useQuery({ queryKey: ['note', selectedNoteId], queryFn: () => api.getNote(selectedNoteId!), enabled: auth === 'app' && !!selectedNoteId })

  const [draftTitle, setDraftTitle] = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (noteDetail) { setDraftTitle(noteDetail.title); setDraftContent(noteDetail.body); setIsDirty(false) }
    else if (!selectedNoteId) { setDraftTitle(''); setDraftContent(''); setIsDirty(false) }
  }, [noteDetail?.id])

  const saveMutation = useMutation({
    mutationFn: (data: { title?: string; body?: string }) => api.updateNote(selectedNoteId!, data),
    onSuccess: () => { setIsDirty(false); qc.invalidateQueries({ queryKey: ['notes'] }); setSaveStatus('saved') },
    onError: () => { setSaveStatus('unsaved') },
  })

  useAutoSave(isDirty, selectedNoteId, draftTitle, draftContent, saveMutation, setSaveStatus)

  useEffect(() => {
    if (saveStatus !== 'saved') return
    const timer = setTimeout(() => setSaveStatus('saved'), 3000)
    return () => clearTimeout(timer)
  }, [saveStatus])

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteNote(selectedNoteId!),
    onSuccess: () => { setSelectedNoteId(null); qc.invalidateQueries({ queryKey: ['notes'] }) },
  })

  const createNote = useMutation({
    mutationFn: () => api.createNote('Untitled', activeFolder || undefined),
    onSuccess: (n) => { setSelectedNoteId(n.id); qc.invalidateQueries({ queryKey: ['notes'] }) },
  })

  const handleSave = useCallback(() => {
    if (!selectedNoteId || !isDirty) return
    setSaveStatus('saving')
    saveMutation.mutate({ title: draftTitle, body: draftContent })
  }, [selectedNoteId, isDirty, draftTitle, draftContent, saveMutation])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') { (e.target as HTMLElement).blur(); return }
        if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); handleSave(); return }
        return
      }
      if (e.key === 'Escape') return
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); createNote.mutate(); return }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); handleSave(); return }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave, createNote])

  if (auth === 'loading') return <div className="min-h-screen flex items-center justify-center bg-base-100"><Loader2 className="size-8 animate-spin text-primary" /></div>
  if (auth === 'landing') return <LandingPage onLogin={() => setAuth('login')} />
  if (auth === 'login') return <LoginPage onBack={() => setAuth('landing')} onLogin={async () => { const u = await api.checkSession(); setUser(u); setAuth('app') }} />

  if (page === 'settings') return <SettingsPage user={user} onBack={() => setPage('app')} />
  if (page === 'admin') return <AdminPage onBack={() => setPage('app')} />

  const sidebarContent = <SidebarContent selectedNoteId={selectedNoteId} onSelectNote={(id) => { setSelectedNoteId(id); closeSidebar() }} user={user} onNavigate={setPage} />

  return (
    <>
      <ThemeSync />
      <div className="drawer lg:drawer-open">
        <input ref={drawerToggle} id="sidebar" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content flex flex-col min-h-screen">
          <div className="navbar bg-base-100 border-b border-base-300 min-h-12 px-2 gap-1">
            <label htmlFor="sidebar" className="btn btn-ghost btn-sm btn-square lg:hidden" title="Open sidebar"><Menu className="size-4" /></label>
            <div className="flex-1 min-w-0">
              {noteDetail ? <span className="truncate text-sm font-medium">{noteDetail.title || 'Untitled'}</span> : <span className="text-sm text-base-content/40">Select a note</span>}
            </div>
            {noteDetail && (
              <div className="flex items-center gap-0.5">
                <div className="join">
                  <button className={`btn btn-ghost btn-xs join-item ${view === 'list' ? 'bg-base-300' : ''}`} onClick={() => setView('list')} title="List view"><List className="size-3.5" /></button>
                  <button className={`btn btn-ghost btn-xs join-item ${view === 'card' ? 'bg-base-300' : ''}`} onClick={() => setView('card')} title="Card view"><Grid3X3 className="size-3.5" /></button>
                </div>
                <button className="btn btn-ghost btn-sm btn-square" onClick={() => setPreviewMode(p => !p)} title={previewMode ? "Show editor" : "Show preview"}>{previewMode ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</button>
                <button className="btn btn-ghost btn-sm btn-square" onClick={() => setShareDialogOpen(true)} title="Share note with others"><Share2 className="size-4" /></button>
                <button className="btn btn-ghost btn-sm btn-square text-error" onClick={() => setDeleteDialog(selectedNoteId)} title="Delete note permanently"><Trash2 className="size-4" /></button>
                <div className="text-xs text-base-content/40 mx-1 min-w-12 text-right">
                  {saveStatus === 'saving' ? <span className="text-warning">Saving...</span> : saveStatus === 'unsaved' ? <span className="text-error">Unsaved</span> : <span className="text-success">Saved</span>}
                </div>
                <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={!isDirty || saveMutation.isPending} title="Save current changes">
                  {saveMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}Save
                </button>
              </div>
            )}
          </div>

          <main className="flex-1 flex flex-col overflow-hidden">
            {noteDetail ? (
              <div className="flex-1 flex flex-col lg:flex-row">
                <div className={`flex-1 flex flex-col ${previewMode ? 'hidden lg:flex' : ''}`}>
                  <div className="p-4 pb-0">
                    <input className="input input-ghost text-xl font-bold tracking-tight w-full px-0" placeholder="Note title" value={draftTitle} onChange={e => { setDraftTitle(e.target.value); setIsDirty(true) }} />
                  </div>
                  <div className="flex items-center gap-0.5 px-2 py-1 border-b border-base-200 bg-base-200/30">
                    <button type="button" className="btn btn-ghost btn-xs px-1.5" onClick={() => insertMarkdown('**', '**', 'bold')} title="Bold"><b>B</b></button>
                    <button type="button" className="btn btn-ghost btn-xs px-1.5 italic" onClick={() => insertMarkdown('*', '*', 'italic')} title="Italic"><i>I</i></button>
                    <button type="button" className="btn btn-ghost btn-xs px-1.5" onClick={() => insertMarkdown('# ', '', 'heading')} title="Heading">H</button>
                    <button type="button" className="btn btn-ghost btn-xs px-1.5" onClick={() => insertMarkdown('> ', '', 'quote')} title="Blockquote">❝</button>
                    <div className="w-px h-4 bg-base-300 mx-0.5" />
                    <button type="button" className="btn btn-ghost btn-xs px-1.5" onClick={() => insertMarkdown('- ', '', 'list item')} title="List">≡</button>
                    <button type="button" className="btn btn-ghost btn-xs px-1.5" onClick={() => insertMarkdown('- [ ] ', '', 'task')} title="Task">☐</button>
                    <button type="button" className="btn btn-ghost btn-xs px-1.5" onClick={() => insertMarkdown('[', '](url)', 'text')} title="Link">🔗</button>
                    <button type="button" className="btn btn-ghost btn-xs px-1.5" onClick={() => insertMarkdown('![', '](url)', 'alt')} title="Image">🖼</button>
                    <button type="button" className="btn btn-ghost btn-xs px-1.5" onClick={() => insertMarkdown('```\n', '\n```', 'code')} title="Code block">{'</>'}</button>
                  </div>
                  <div className="flex-1 p-4 pt-2">
                    <textarea ref={textareaRef} className="textarea textarea-ghost w-full h-full font-mono text-sm resize-none p-0" placeholder="Write in markdown..." value={draftContent} onChange={e => { setDraftContent(e.target.value); setIsDirty(true) }} />
                  </div>
                </div>
                <div className={`flex-1 border-t lg:border-t-0 lg:border-l border-base-300 overflow-hidden p-4 bg-base-200/50 ${!previewMode ? 'hidden lg:block' : ''}`}>
                  <div className="markdown-body" dangerouslySetInnerHTML={{ __html: draftContent ? marked.parse(draftContent, { async: false }) as string : '<em class="opacity-50">Empty</em>' }} />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col p-4 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold tracking-tight">{showShared ? 'Shared' : activeFolder || 'All Notes'}</h2>
                  {!showShared && <button className="btn btn-primary btn-sm" onClick={() => createNote.mutate()}><Plus className="size-4" />New Note</button>}
                </div>
                {!notes ? (
                  <div className="flex-1 flex items-center justify-center"><Loader2 className="size-6 animate-spin text-base-content/30" /></div>
                ) : notes.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 text-base-content/40">
                    <FileText className="size-12 opacity-30" />
                    <p className="text-sm">No notes yet.</p>
                  </div>
                ) : showShared ? (
                  <div className="overflow-y-auto min-h-0 flex-1">
                    <table className="table table-pin-rows">
                      <thead>
                        <tr className="text-[11px] uppercase tracking-wider">
                          <th>Note</th>
                          <th>Link</th>
                          <th>Views</th>
                          <th>Expires</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {notes.filter(n => n.shareToken).map(n => {
                          const url = `${location.origin}/api/s/${n.shareToken}`
                          const expired = n.shareExpiresAt && new Date(n.shareExpiresAt) < new Date()
                          const remaining = n.shareExpiresAt ? Math.round((new Date(n.shareExpiresAt).getTime() - Date.now()) / 3600000) : null
                          return (
                            <tr key={n.id} className="hover cursor-pointer" onClick={() => setSelectedNoteId(n.id)}>
                              <td>
                                <div className="font-medium text-sm truncate max-w-40">{n.title || 'Untitled'}</div>
                                <div className="text-[10px] text-base-content/30">{new Date(n.updatedAt).toLocaleDateString()}</div>
                              </td>
                              <td>
                                <button className="btn btn-ghost btn-xs gap-1" onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(url) }} title={url}>
                                  <Copy className="size-3" />
                                </button>
                              </td>
                              <td className="text-sm tabular-nums">
                                {n.viewCount}
                                {n.maxViews !== null && <span className="text-base-content/30"> / {n.maxViews}</span>}
                              </td>
                              <td className="text-sm">
                                {n.shareExpiresAt ? (
                                  expired
                                    ? <span className="text-error">Expired</span>
                                    : remaining !== null && remaining < 24
                                      ? <span className="text-warning">{remaining}h</span>
                                      : <span>{new Date(n.shareExpiresAt).toLocaleDateString()}</span>
                                ) : <span className="text-base-content/30">—</span>}
                              </td>
                              <td>
                                <span className={`badge badge-xs ${n.visibility === 'PUBLIC' ? 'badge-success' : 'badge-info'}`}>{n.visibility}</span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className={`grid gap-3 ${view === 'card' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                    {notes.map(n => (
                      <button key={n.id} className={`card bg-base-200 hover:bg-base-300 transition-colors text-left ${view === 'card' ? 'p-4' : 'p-3 flex-row items-center gap-3'}`} onClick={() => setSelectedNoteId(n.id)}>
                        {view === 'card' ? (
                          <>
                            <h3 className="font-semibold truncate text-sm">{n.title || 'Untitled'}</h3>
                            {n.folder && <div className="badge badge-ghost badge-xs">{n.folder}</div>}
                            <div className="text-xs text-base-content/30 mt-1">{new Date(n.updatedAt).toLocaleDateString()}</div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
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
          <aside className="bg-base-200 w-72 h-dvh flex flex-col border-r border-base-300 sticky top-0">{sidebarContent}</aside>
        </div>
      </div>

      {noteDetail && <ShareDialog note={noteDetail} open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} />}
      <ConfirmDialog open={!!deleteDialog} title="Delete Note" message="Delete this note permanently?" onConfirm={() => { if (deleteDialog) deleteMutation.mutate(); setDeleteDialog(null) }} onClose={() => setDeleteDialog(null)} />
    </>
  )
}

export default App
