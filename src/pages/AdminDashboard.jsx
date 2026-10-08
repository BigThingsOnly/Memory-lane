import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { BrandMark } from '../components/AppHeader.jsx'

export default function AdminDashboard() {
  const [status, setStatus] = useState('checking') // 'checking' | 'denied' | 'ok'
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setStatus('denied'); return }

    const { data: adminRow } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!adminRow) { setStatus('denied'); return }

    setStatus('ok')
    setLoading(true)
    // No host_id filter here — RLS allows an admin to read every event.
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
    setEvents(data || [])
    setLoading(false)
  }

  if (status === 'checking') {
    return <div style={styles.stage}><p style={{ color: '#fff' }}>Checking access…</p></div>
  }

  if (status === 'denied') {
    return (
      <div style={styles.stage}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>🔒</div>
          <h2 style={{ color: '#fff', marginBottom: 8 }}>Admin access only</h2>
          <p style={{ color: '#9a97a3', marginBottom: 20 }}>
            Your account isn't set up as an admin. If this should be you, ask
            whoever manages the database to add your account to the{' '}
            <code>admins</code> table.
          </p>
          <Link to="/dashboard" style={styles.linkBtn}>Go to my dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#d9cfff' }}><BrandMark /></span>
          <span style={styles.badge}>🛡 Admin</span>
          <span style={{ color: '#fff', fontWeight: 700, letterSpacing: '-0.03em' }}>MemoryLane</span>
        </div>
        <Link to="/dashboard" style={{ color: '#c9c5d1', fontSize: 13 }}>My host dashboard</Link>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 60px' }}>
        <div style={{ color: '#8b7fd6', fontSize: 11, letterSpacing: '0.16em', fontWeight: 800, marginBottom: 8, textTransform: 'uppercase' }}>
          All events — every host
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 32, letterSpacing: '-0.02em', margin: '0 0 6px', color: '#fff' }}>Admin overview</h1>
        <p style={{ color: '#9a97a3', marginBottom: 28, fontSize: 14 }}>
          Read-only — you can view any event's memories or slideshow, but only
          each event's own host can edit or delete it.
        </p>

        {loading && [0, 1, 2].map((i) => <div key={i} className="skeleton-dark" style={{ height: 88, marginBottom: 12 }} />)}
        {!loading && events.length === 0 && <p style={{ color: '#9a97a3' }}>No events on the platform yet.</p>}

        {events.map((ev, i) => (
          <div key={ev.id} className="admin-card stagger-item" style={{ '--d': `${i * 50}ms` }}>
            <div>
              <div style={{ color: '#6b6875', fontSize: 12, marginBottom: 4 }}>
                host: {ev.host_id.slice(0, 8)}… · created {new Date(ev.created_at).toLocaleDateString()}
              </div>
              <h3 style={{ margin: '0 0 4px', color: '#fff' }}>{ev.name}</h3>
              <p style={{ margin: 0, color: '#9a97a3', fontSize: 13 }}>/e/{ev.slug}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link to={`/e/${ev.slug}`} target="_blank" className="admin-ghost-btn">Guest page</Link>
              <Link to={`/event/${ev.id}/gallery`} className="admin-ghost-btn">Memories</Link>
              <Link to={`/event/${ev.id}/slideshow`} target="_blank" className="admin-ghost-btn">Slideshow</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  stage: { background: '#121013', minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 30 },
  header: {
    height: 60, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#121013', borderBottom: '1px solid #2a2830',
  },
  badge: {
    background: '#3d2f6b', color: '#d9cfff', fontSize: 11, fontWeight: 800, padding: '4px 10px',
    borderRadius: 999, letterSpacing: '0.04em',
  },
  linkBtn: {
    display: 'inline-block', background: '#3d2f6b', color: '#fff', padding: '10px 18px', borderRadius: 999, fontSize: 13, fontWeight: 700,
  },
}
