import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, Plus, Sun, Moon, LogOut,
  Folder, FolderOpen, FileText, Share2,
  List, Settings, Shield,
} from 'lucide-react'
import * as api from '../api'
import { useStore } from '../store'
import { NoteListItem, FolderPill } from './NoteListItem'

export function SidebarContent({ selectedNoteId, onSelectNote, user, onNavigate }: { selectedNoteId: string | null; onSelectNote: (id: string) => void; user: api.User | null; onNavigate: (page: 'settings' | 'admin') => void }) {
  const { data: folders } = useQuery({ queryKey: ['folders'], queryFn: api.getFolders })
  const { data: notes } = useQuery({ queryKey: ['notes'], queryFn: () => api.getNotes() })
  const { activeFolder, setActiveFolder, showShared, setShowShared, searchQuery, setSearchQuery, theme, toggleTheme } = useStore()
  const qc = useQueryClient()
  const logout = useMutation({ mutationFn: api.logout, onSuccess: () => { qc.clear(); window.location.reload() } })
  const createNote = useMutation({
    mutationFn: () => api.createNote('Untitled', activeFolder || undefined),
    onSuccess: (n) => { qc.invalidateQueries({ queryKey: ['notes'] }); onSelectNote(n.id) },
  })
  const filtered = useMemo(() => {
    if (!notes) return []
    let list = showShared ? notes.filter(n => n.shareToken) : activeFolder ? notes.filter(n => n.folder === activeFolder) : notes
    if (searchQuery) { const q = searchQuery.toLowerCase(); list = list.filter(n => n.title.toLowerCase().includes(q)) }
    return list
  }, [notes, activeFolder, showShared, searchQuery])

  const sharedCount = useMemo(() => notes?.filter(n => n.shareToken).length || 0, [notes])

  return (
    <div className="flex flex-col h-dvh select-none overflow-hidden">
      <div className="shrink-0 px-3 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="size-3.5 text-primary" />
            </div>
            <h1 className="text-base font-semibold tracking-tight">Notes</h1>
          </div>
          <button className="btn btn-ghost btn-xs btn-square rounded-lg" onClick={() => createNote.mutate()}>
            <Plus className="size-3.5" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-base-content/30 pointer-events-none" />
          <input
            className="input input-xs w-full pl-7 h-8 rounded-xl bg-base-300/40 border-transparent focus:border-primary/30 focus:bg-base-200 transition-all placeholder:text-base-content/25 text-xs"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="shrink-0 px-3 pb-2">
        <div className="flex items-center gap-1.5 mb-2">
          <Folder className="size-3 text-base-content/30" />
          <span className="text-[11px] font-medium text-base-content/35 uppercase tracking-widest">Folders</span>
        </div>
        <div className="space-y-0.5">
          <FolderPill
            icon={<List className="size-3.5" />}
            label="All Notes"
            count={notes?.length}
            active={!activeFolder && !showShared}
            onClick={() => { setActiveFolder(null); setShowShared(false) }}
          />
          {folders?.map(f => (
            <FolderPill
              key={f.name}
              icon={<FolderOpen className="size-3.5" />}
              label={f.name}
              count={f.count}
              active={activeFolder === f.name}
              onClick={() => { setActiveFolder(f.name); setShowShared(false) }}
            />
          ))}
          <FolderPill
            icon={<Share2 className="size-3.5" />}
            label="Shared"
            count={sharedCount}
            active={showShared}
            onClick={() => { setShowShared(true); setActiveFolder(null) }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 min-h-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <FileText className="size-3 text-base-content/30" />
            <span className="text-[11px] font-medium text-base-content/35 uppercase tracking-widest">Notes</span>
          </div>
          <span className="text-[10px] text-base-content/20 tabular-nums">{filtered.length}</span>
        </div>
        <div className="space-y-0.5">
          {filtered.map(n => <NoteListItem key={n.id} note={n} active={n.id === selectedNoteId} onClick={() => onSelectNote(n.id)} />)}
        </div>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <FileText className="size-6 text-base-content/10 mb-2" />
            <p className="text-xs text-base-content/25">{searchQuery ? 'No results found' : 'No notes yet'}</p>
          </div>
        )}
      </div>

      <div className="shrink-0 mt-auto border-t border-base-300/50 px-3 py-2.5">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-base-300">
            {user?.avatar
              ? <img src={user.avatar} className="size-full object-cover" />
              : <span className="text-[11px] font-semibold text-primary">{user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate leading-tight">{user?.name || user?.email}</div>
            <div className="text-[10px] text-base-content/25 truncate">{user?.name ? user?.email : ''}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-base-content/50 hover:text-base-content hover:bg-base-300/50 transition-all" onClick={() => onNavigate('settings')}>
            <Settings className="size-3" /> Settings
          </button>
          {user?.role === 'ADMIN' && (
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-base-content/50 hover:text-base-content hover:bg-base-300/50 transition-all" onClick={() => onNavigate('admin')}>
              <Shield className="size-3" /> Admin
            </button>
          )}
          <div className="flex-1" />
          <button className="btn btn-ghost btn-xs btn-square rounded-lg" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? <Sun className="size-3" /> : <Moon className="size-3" />}
          </button>
          <button className="btn btn-ghost btn-xs btn-square rounded-lg" onClick={() => logout.mutate()} title="Sign out">
            <LogOut className="size-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
