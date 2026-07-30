import { useMemo, type ReactNode } from 'react'
import { FileText } from 'lucide-react'
import type { NoteListItem } from '../api'
import { formatRelativeTime } from '../utils/format'

export function NoteListItem({ note, active, onClick }: { note: NoteListItem; active: boolean; onClick: () => void }) {
  const updated = useMemo(() => formatRelativeTime(note.updatedAt), [note.updatedAt])
  const bodyPreview = useMemo(() => {
    if (!note.body) return ''
    const txt = note.body.replace(/[#*`\[\]()>~_|]/g, '').trim()
    return txt.length > 60 ? txt.slice(0, 60) + '…' : txt
  }, [note.body])
  return (
    <button
      className={`group relative w-full text-left p-2.5 rounded-xl text-sm transition-all duration-150 ${
        active
          ? 'bg-primary/8 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
          : 'hover:bg-base-300/50 text-base-content/70 hover:text-base-content'
      }`}
      onClick={onClick}
    >
      {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary" />}
      <div className="flex items-start gap-2.5 pl-1">
        <div className={`mt-0.5 size-4 rounded-md flex items-center justify-center shrink-0 transition-colors ${
          active ? 'bg-primary/15 text-primary' : 'bg-base-300/60 text-base-content/30 group-hover:bg-base-300/80'
        }`}>
          <FileText className="size-2.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate leading-snug">{note.title || 'Untitled'}</div>
          {bodyPreview && <div className="text-[11px] text-base-content/30 leading-relaxed mt-0.5 line-clamp-1">{bodyPreview}</div>}
          <div className="text-[10px] text-base-content/20 mt-0.5">{updated}</div>
        </div>
      </div>
    </button>
  )
}

export function FolderPill({ icon, label, count, active, onClick }: { icon: ReactNode; label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button
      className={`flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150 ${
        active
          ? 'bg-primary/8 text-primary font-medium'
          : 'text-base-content/55 hover:text-base-content hover:bg-base-300/40'
      }`}
      onClick={onClick}
    >
      <span className={active ? 'text-primary' : 'text-base-content/30'}>{icon}</span>
      <span className="flex-1 text-left truncate">{label}</span>
      {count !== undefined && (
        <span className={`text-[10px] tabular-nums ${active ? 'text-primary/50' : 'text-base-content/20'}`}>{count}</span>
      )}
    </button>
  )
}
