import { useState } from 'react'
import { supabase } from '../supabaseClient'
import AppHeader from '../components/AppHeader.jsx'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/dashboard' },
    })
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div>
      <AppHeader />
      <div style={{ minHeight: 'calc(100vh - 72px)', display: 'grid', placeItems: 'center', padding: 40 }}>
        <div className="panel">
          <div className="eyebrow">Host access</div>
          <h2>Welcome back.</h2>
          <p className="muted">Sign in without a password using a secure email link.</p>
          {sent ? (
            <div className="notice" style={{ marginTop: 20 }}>Check your email for your sign-in link.</div>
          ) : (
            <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="btn" type="submit">Send magic link</button>
            </form>
          )}
          {error && <p style={{ color: 'crimson' }}>{error}</p>}
        </div>
      </div>
    </div>
  )
}
