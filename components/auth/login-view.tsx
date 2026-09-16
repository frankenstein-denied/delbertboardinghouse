'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { firebaseConfigured } from '@/lib/firebase'

type Mode = 'login' | 'signup'

export function LoginView() {
  const { signUp, logIn } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [program, setProgram] = useState('')
  const [room, setRoom] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!firebaseConfigured) {
    return (
      <main className="onboarding">
        <section className="welcome-card">
          <div className="brand-lockup">
            <span className="logo-mark">D</span>
            <strong>delbert</strong>
          </div>
          <div className="welcome-copy">
            <h1>Firebase isn&apos;t configured yet</h1>
            <p>
              Add your project&apos;s values to <code>.env.local</code> (see{' '}
              <code>.env.local.example</code>) and restart the dev server.
            </p>
          </div>
        </section>
      </main>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        if (!name.trim() || !program.trim() || !room.trim()) {
          throw new Error('Please fill in your name, program, and room.')
        }
        await signUp(email, password, rememberMe, { name, program, room })
      } else {
        await logIn(email, password, rememberMe)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="onboarding">
      <div className="onboarding-art">
        <div className="sun-circle" />
        <div className="house-card">
          <span>DELBERT</span>
          <div className="window-grid"><i /><i /><i /><i /></div>
          <div className="house-door" />
        </div>
        <div className="floating-note note-one">🍞 extra pandesal</div>
        <div className="floating-note note-two">study buddy?</div>
      </div>
      <section className="welcome-card">
        <div className="brand-lockup">
          <span className="logo-mark">D</span>
          <strong>delbert</strong>
        </div>
        <div className="welcome-copy">
          <span className="eyebrow">YOUR HOUSE, YOUR PEOPLE</span>
          <h1>Welcome to Delbert <span>👋</span></h1>
          <p>Your boarding house community, all in one place.</p>
        </div>
        <div className="auth-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Log in</button>
          <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Sign up</button>
        </div>
        <form className="onboarding-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <>
              <label>Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan Dela Cruz" required /></label>
              <label>Program<input value={program} onChange={(e) => setProgram(e.target.value)} placeholder="BS Computer Science" required /></label>
              <label>Room<input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Room 204" required /></label>
            </>
          )}
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="username@email.com" required /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} required /></label>
          <label className="remember-me-row">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
            <span>Remember me</span>
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <Button type="submit" className="continue-button" disabled={submitting}>
            {submitting ? 'Please wait…' : mode === 'signup' ? 'Create account →' : 'Log in →'}
          </Button>
        </form>
        <p className="privacy-note"><Sparkles /> A cozy, private space for your boarding-house community.</p>
      </section>
    </main>
  )
}
