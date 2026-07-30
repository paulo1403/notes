import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { marked } from 'marked'
import { Loader2, FileText, Plus, X, Camera, User, ChevronRight, Copy, ExternalLink, Share2 } from 'lucide-react'
import * as api from '../api'
import { useStore } from '../store'
import { ConfirmDialog } from './ConfirmDialog'
import { ShareDialog } from './ShareDialog'
import { SidebarContent } from './SidebarContent'
import { ThemeSync } from './ThemeSync'
import { useInsertMarkdown } from '../hooks/useInsertMarkdown'
import { useAutoSave } from '../hooks/useAutoSave'

export function SettingsPage({ user, onBack }: { user: api.User | null; onBack: () => void }) {
  const { data: profile, refetch } = useQuery({ queryKey: ['profile'], queryFn: api.getProfile })
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  useEffect(() => { if (profile) { setName(profile.name); setBio(profile.bio || '') } }, [profile])
  const saveProfile = useMutation({
    mutationFn: () => api.updateProfile({ name, bio }),
    onSuccess: () => { refetch() },
  })
  const uploadPhoto = useMutation({
    mutationFn: (file: File) => api.uploadAvatar(file),
    onSuccess: () => { refetch() },
  })
  return (
    <div className="min-h-screen bg-base-100 p-4 max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-2"><button className="btn btn-ghost btn-sm btn-square" onClick={onBack}><ChevronRight className="rotate-180 size-4" /></button><h1 className="text-lg font-bold">Settings</h1></div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="size-16 rounded-full bg-base-300 flex items-center justify-center overflow-hidden">
            {profile?.avatar ? <img src={profile.avatar} className="size-full object-cover" /> : <User className="size-6 opacity-40" />}
          </div>
          <label className="absolute -bottom-1 -right-1 btn btn-primary btn-xs btn-circle">
            <Camera className="size-3" />
            <input type="file" className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto.mutate(f) }} />
          </label>
        </div>
        <div><div className="font-medium">{user?.name || user?.email}</div><div className="text-xs text-base-content/40">{profile?.email}</div></div>
      </div>
      <fieldset className="fieldset"><legend className="fieldset-legend text-xs">Name</legend><input className="input w-full" value={name} onChange={e => setName(e.target.value)} /></fieldset>
      <fieldset className="fieldset"><legend className="fieldset-legend text-xs">Bio</legend><textarea className="textarea w-full" rows={3} value={bio} onChange={e => setBio(e.target.value)} /></fieldset>
      <button className="btn btn-primary w-full" onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
        {saveProfile.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {profile && (name !== profile.name || bio !== (profile.bio || '')) ? 'Save changes' : 'Saved'}
      </button>
    </div>
  )
}

export function AdminPage({ onBack }: { onBack: () => void }) {
  const qc = useQueryClient()
  const { data: users, isLoading } = useQuery({ queryKey: ['adminUsers'], queryFn: api.getAdminUsers })
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editPw, setEditPw] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const updateUser = useMutation({
    mutationFn: (data: { name?: string; role?: string; password?: string }) => api.updateAdminUser(editId!, data),
    onSuccess: () => { setEditId(null); setEditPw(''); qc.invalidateQueries({ queryKey: ['adminUsers'] }) },
  })
  const deleteUser = useMutation({
    mutationFn: () => api.deleteAdminUser(deleteId!),
    onSuccess: () => { setDeleteId(null); qc.invalidateQueries({ queryKey: ['adminUsers'] }) },
  })
  return (
    <div className="min-h-screen bg-base-100 p-4 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2"><button className="btn btn-ghost btn-sm btn-square" onClick={onBack}><ChevronRight className="rotate-180 size-4" /></button><h1 className="text-lg font-bold">Admin — Users</h1></div>
      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin" /></div> : (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Notes</th><th>Joined</th><th></th></tr></thead>
            <tbody>
              {users?.map(u => (
                <tr key={u.id}>
                  {editId === u.id ? (
                    <>
                      <td><input className="input input-xs w-24" value={editName} onChange={e => setEditName(e.target.value)} /></td>
                      <td className="text-sm text-base-content/60">{u.email}</td>
                      <td>
                        <select className="select select-xs" value={editRole} onChange={e => setEditRole(e.target.value)}>
                          <option value="USER">USER</option><option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                      <td>{u.noteCount}</td>
                      <td className="text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="flex gap-1">
                        <input className="input input-xs w-20" placeholder="New password" value={editPw} onChange={e => setEditPw(e.target.value)} />
                        <button className="btn btn-ghost btn-xs" onClick={() => updateUser.mutate({ name: editName, role: editRole, ...(editPw ? { password: editPw } : {}) })}>Save</button>
                        <button className="btn btn-ghost btn-xs" onClick={() => { setEditId(null); setEditPw('') }}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="font-medium">{u.name}</td>
                      <td className="text-sm">{u.email}</td>
                      <td><span className={`badge badge-xs ${u.role === 'ADMIN' ? 'badge-primary' : ''}`}>{u.role}</span></td>
                      <td>{u.noteCount}</td>
                      <td className="text-xs text-base-content/40">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="flex gap-1">
                          <button className="btn btn-ghost btn-xs" onClick={() => { setEditId(u.id); setEditName(u.name); setEditRole(u.role) }}>Edit</button>
                          <button className="btn btn-ghost btn-xs text-error" onClick={() => setDeleteId(u.id)}>Delete</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog open={!!deleteId} title="Delete User" message="Delete this user and all their notes?" onConfirm={() => deleteUser.mutate()} onClose={() => setDeleteId(null)} />
    </div>
  )
}
