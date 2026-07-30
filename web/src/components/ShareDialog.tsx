import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Copy, ExternalLink, Loader2, User, Share2 } from 'lucide-react'
import * as api from '../api'
import type { NoteDetail } from '../api'
import { formatRelativeTime } from '../utils/format'

export function ShareDialog({ note, open, onClose }: { note: NoteDetail; open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'link' | 'users'>('link')
  const [visibility, setVisibility] = useState<'PRIVATE' | 'LINK' | 'PUBLIC'>(note.visibility)
  const [expiresIn, setExpiresIn] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<{ id: string; name: string; email: string }[]>([])
  const shareLink = useMutation({
    mutationFn: () => api.shareNote(note.id, { visibility, ...(expiresIn ? { expiresIn: Number(expiresIn) } : {}) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['note', note.id] }); qc.invalidateQueries({ queryKey: ['notes'] }) },
  })
  const revoke = useMutation({
    mutationFn: () => api.revokeShare(note.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['note', note.id] }); qc.invalidateQueries({ queryKey: ['notes'] }) },
  })
  const inviteUsers = useMutation({
    mutationFn: () => api.shareWithUsers(note.id, selectedUsers.map(u => u.id)),
    onSuccess: () => { setSelectedUsers([]); qc.invalidateQueries({ queryKey: ['note', note.id] }) },
  })
  const removeUser = useMutation({
    mutationFn: (userId: string) => api.removeUserShare(note.id, userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['note', note.id] }) },
  })
  const { data: searchResults } = useQuery({
    queryKey: ['userSearch', searchQ],
    queryFn: () => api.searchUsers(searchQ),
    enabled: searchQ.length >= 2,
  })
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { if (!ref.current) return; open ? ref.current.showModal() : ref.current.close() }, [open])
  useEffect(() => { if (open) { setVisibility(note.visibility); setExpiresIn(''); setTab('link'); setSearchQ(''); setSelectedUsers([]) } }, [open, note.visibility])
  const shareUrl = note.shareToken ? `${location.origin}/api/s/${note.shareToken}` : null
  const excludeIds = new Set([...(note.shares || []).map(s => s.user.id), ...selectedUsers.map(u => u.id)])
  return (
    <dialog ref={ref} className="modal" onClose={onClose}>
      <div className="modal-box">
        <form method="dialog"><button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"><X className="size-4" /></button></form>
        <h3 className="font-bold text-lg mb-4">Share Note</h3>
        <div className="tabs tabs-box mb-4">
          <button className={`tab flex-1 ${tab === 'link' ? 'tab-active' : ''}`} onClick={() => setTab('link')}>Link</button>
          <button className={`tab flex-1 ${tab === 'users' ? 'tab-active' : ''}`} onClick={() => setTab('users')}>Users</button>
        </div>
        {tab === 'link' ? (
          note.visibility !== 'PRIVATE' && shareUrl ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-2 bg-base-300 rounded-lg">
                <input className="input input-ghost flex-1 text-sm" readOnly value={shareUrl} />
                <button className="btn btn-ghost btn-sm btn-square" onClick={() => { navigator.clipboard.writeText(shareUrl); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 1500) }} title="Copy link">{linkCopied ? <span className="text-xs text-success font-medium">Copied!</span> : <Copy className="size-4" />}</button>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className={`badge ${note.visibility === 'PUBLIC' ? 'badge-success' : 'badge-info'} badge-xs`}>{note.visibility}</span>
                <span className="text-base-content/50">{note.viewCount} view{note.viewCount !== 1 ? 's' : ''}</span>
                {note.maxViews !== null && <span className="text-base-content/50">Max: {note.maxViews}</span>}
                {note.shareExpiresAt && (
                  <span className={new Date(note.shareExpiresAt) < new Date() ? 'text-error' : 'text-base-content/50'}>
                    {new Date(note.shareExpiresAt) < new Date() ? 'Expired' : `Expires ${new Date(note.shareExpiresAt).toLocaleDateString()}`}
                  </span>
                )}
              </div>
              <div className="join w-full">
                <button className={`btn join-item flex-1 ${visibility === 'LINK' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setVisibility('LINK')}>Link</button>
                <button className={`btn join-item flex-1 ${visibility === 'PUBLIC' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setVisibility('PUBLIC')}>Public</button>
              </div>
              <select className="select select-bordered w-full" value={expiresIn} onChange={e => setExpiresIn(e.target.value)}>
                <option value="">No expiry</option>
                <option value="3600">1 hour</option>
                <option value="86400">24 hours</option>
                <option value="604800">7 days</option>
                <option value="2592000">30 days</option>
              </select>
              <div className="flex gap-2">
                <button className="btn btn-primary flex-1" onClick={() => shareLink.mutate()} disabled={shareLink.isPending}>
                  {shareLink.isPending ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
                  Update
                </button>
                <button className="btn btn-ghost btn-sm text-error" onClick={() => revoke.mutate()}>Remove</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-base-content/60">Share this note via a link.</p>
              <div className="join w-full">
                <button className={`btn join-item flex-1 ${visibility === 'LINK' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setVisibility('LINK')}>Link</button>
                <button className={`btn join-item flex-1 ${visibility === 'PUBLIC' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setVisibility('PUBLIC')}>Public</button>
              </div>
              <select className="select select-bordered w-full" value={expiresIn} onChange={e => setExpiresIn(e.target.value)}>
                <option value="">No expiry</option>
                <option value="3600">1 hour</option>
                <option value="86400">24 hours</option>
                <option value="604800">7 days</option>
                <option value="2592000">30 days</option>
              </select>
              <button className="btn btn-primary w-full" onClick={() => shareLink.mutate()} disabled={shareLink.isPending}>
                {shareLink.isPending ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
                Create share link
              </button>
            </div>
          )
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-base-content/60">Share with registered users.</p>
            {(note.shares && note.shares.length > 0) && (
              <div className="space-y-1">
                {note.shares.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2 bg-base-300 rounded-lg">
                    <div className="flex items-center gap-2 text-sm"><User className="size-3.5" />{s.user.name || s.user.email}</div>
                    <button className="btn btn-ghost btn-xs text-error" onClick={() => removeUser.mutate(s.user.id)} disabled={removeUser.isPending}><X className="size-3" /></button>
                  </div>
                ))}
              </div>
            )}
            <fieldset className="fieldset"><legend className="fieldset-legend text-xs">Search users</legend><input className="input w-full" placeholder="Type to search..." value={searchQ} onChange={e => setSearchQ(e.target.value)} /></fieldset>
            {searchQ.length >= 2 && searchResults && searchResults.length > 0 && (
              <div className="max-h-40 overflow-hidden space-y-1">
                {searchResults.filter(u => !excludeIds.has(u.id)).map(u => (
                  <button key={u.id} className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-base-300 text-left text-sm" onClick={() => { setSelectedUsers(prev => [...prev, u]); setSearchQ('') }}>
                    <User className="size-3.5" />{u.name || u.email} <span className="text-xs text-base-content/40">{u.email}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedUsers.map(u => (
                  <span key={u.id} className="badge badge-ghost gap-1">{u.name || u.email}<button onClick={() => setSelectedUsers(prev => prev.filter(x => x.id !== u.id))}><X className="size-2.5" /></button></span>
                ))}
              </div>
            )}
            <button className="btn btn-primary w-full" onClick={() => inviteUsers.mutate()} disabled={selectedUsers.length === 0 || inviteUsers.isPending}>
              {inviteUsers.isPending ? <Loader2 className="size-4 animate-spin" /> : <User className="size-4" />}
              Share with {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}
            </button>
          </div>
        )}
        {shareLink.error && <p className="text-error text-sm mt-2">{(shareLink.error as Error).message}</p>}
      </div>
      <form method="dialog" className="modal-backdrop"><button>close</button></form>
    </dialog>
  )
}
