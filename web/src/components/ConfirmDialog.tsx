import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export function ConfirmDialog({ open, title, message, onConfirm, onClose }: { open: boolean; title: string; message: string; onConfirm: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { if (!ref.current) return; open ? ref.current.showModal() : ref.current.close() }, [open])
  return (
    <dialog ref={ref} className="modal" onClose={onClose}>
      <div className="modal-box">
        <form method="dialog"><button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"><X className="size-4" /></button></form>
        <h3 className="font-bold text-lg mb-2">{title}</h3>
        <p className="text-base-content/60 text-sm mb-4">{message}</p>
        <div className="modal-action"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-error" onClick={onConfirm}>Delete</button></div>
      </div>
      <form method="dialog" className="modal-backdrop"><button>close</button></form>
    </dialog>
  )
}
