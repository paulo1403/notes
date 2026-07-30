import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronRight, Loader2 } from 'lucide-react'
import * as api from '../api'

const formSchema = z.object({ email: z.string().email(), password: z.string().min(1), name: z.string().optional() })

export function LoginPage({ onBack, onLogin }: { onBack: () => void; onLogin: () => void }) {
  const [isRegister, setIsRegister] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm({ resolver: zodResolver(formSchema) })
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      if (isRegister) {
        if (data.password.length < 6) { setError('password', { message: 'Min 6 characters' }); return }
        await api.register(data.email, data.password, data.name)
      } else { await api.login(data.email, data.password) }
      onLogin()
    } catch (e) { setError('root', { message: e instanceof Error ? e.message : 'Failed' }) }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100 p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="card bg-base-200 w-full max-w-sm p-6 space-y-4">
        <button type="button" className="btn btn-ghost btn-sm self-start -ml-2 -mt-2 gap-1" onClick={onBack}><ChevronRight className="rotate-180 size-3" /> Back</button>
        <h1 className="text-2xl font-bold tracking-tight">{isRegister ? 'Create account' : 'Sign in'}</h1>
        <p className="text-sm text-base-content/60">{isRegister ? 'Register a new account' : 'Enter your credentials'}</p>
        {isRegister && <fieldset className="fieldset"><legend className="fieldset-legend text-xs">Name</legend><input className="input w-full" {...register('name')} autoFocus /></fieldset>}
        <fieldset className="fieldset"><legend className="fieldset-legend text-xs">Email</legend><input type="email" className="input w-full" {...register('email')} autoFocus={!isRegister} /></fieldset>
        <fieldset className="fieldset"><legend className="fieldset-legend text-xs">Password</legend><input type="password" className="input w-full" {...register('password')} /></fieldset>
        {errors.root && <p className="text-error text-sm">{errors.root.message}</p>}
        {errors.password && <p className="text-error text-sm">{errors.password.message}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>{isSubmitting && <Loader2 className="size-4 animate-spin" />}{isRegister ? 'Create account' : 'Sign in'}</button>
        <p className="text-xs text-center text-base-content/50">
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <button type="button" className="link link-primary" onClick={() => setIsRegister(r => !r)}>{isRegister ? 'Sign in' : 'Register'}</button>
        </p>
      </form>
    </div>
  )
}
