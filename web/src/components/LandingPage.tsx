import { FileText } from 'lucide-react'

export function LandingPage({ onLogin }: { onLogin: () => void }) {
  return (
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
}
