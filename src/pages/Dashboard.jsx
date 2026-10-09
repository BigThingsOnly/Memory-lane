import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import AppHeader from '../components/AppHeader.jsx'
import { useToast } from '../components/ToastProvider.jsx'
import { useConfirm } from '../components/ConfirmProvider.jsx'
import EventQR from '../components/EventQR.jsx'

// storage.list() returns at most 100 items per call by default — page through
// with offset so an event with more uploads than that doesn't leave files behind.
async function listAllFiles(bucket, prefix) {
  const all = []
  const pageSize = 100
  let offset = 0
  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: pageSize, offset })
    if (error || !data || data.length === 0) break
    all.push(...data)
    if (data.length < pageSize) break
    offset += pageSize
  }
  return all
}

export default function Dashboard() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [qrEvent, setQrEvent] = useState(null) // event whose QR code modal is open
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()

  useEffect(() => { loadEvents() }, [])

  useEffect(() => {
    if (!qrEvent) return
    const onKey = (e) => { if (e.key === 'Escape') setQrEvent(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [qrEvent])

  async function loadEvents() {
    setLoading(true)
    // getSession() reads the saved login locally, so a slow or dropped connection
    // can't make a signed-in host look signed out. (A genuine sign-out is handled by
    // the route guard in App.jsx, which redirects on its own.)
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) {
      setLoading(false)
      toast("Couldn't confirm your sign-in. Check your connection and refresh the page.", 'error')
      return
    }
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('host_id', user.id)
      .order('created_at', { ascending: false })
    setEvents(data || [])
    setLoading(false)
  }

  async function createEvent() {
    const name = window.prompt('Event name (e.g. "John & Amara\'s Wedding")')
    if (!name) return
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).slice(2, 6)

    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) { toast("Couldn't confirm your sign-in. Check your connection and try again.", 'error'); return }
    const { data, error } = await supabase
      .from('events')
      .insert({ name, slug, host_id: user.id })
      .select()
      .single()

    if (error) { toast(error.message, 'error'); return }
    navigate(`/event/${data.id}/edit`)
  }

  async function signOut() {
    await supabase.auth.signOut({ scope: 'local' }) // this device only — don't sign the host out everywhere
    navigate('/')
  }

  async function deleteEvent(ev) {
    const confirmed = await confirm({
      title: `Delete "${ev.name}"?`,
      message: "This permanently removes the event and every memory guests uploaded to it. This can't be undone.",
      confirmLabel: 'Delete event',
      danger: true,
    })
    if (!confirmed) return

    // Clean up the actual files first (deleting the DB row alone would leave them orphaned in storage).
    for (const bucket of ['memories', 'branding']) {
      const files = await listAllFiles(bucket, ev.id)
      if (files.length > 0) {
        const paths = files.map((f) => `${ev.id}/${f.name}`)
        // Remove in chunks so one very large event doesn't send an oversized request.
        for (let i = 0; i < paths.length; i += 100) {
          await supabase.storage.from(bucket).remove(paths.slice(i, i + 100))
        }
      }
    }

    const { error } = await supabase.from('events').delete().eq('id', ev.id)
    if (error) { toast(error.message, 'error'); return }
    setEvents(events.filter((e) => e.id !== ev.id))
    toast(`"${ev.name}" deleted.`, 'success')
  }

  function copyLink(slug) {
    const link = `${window.location.origin}/e/${slug}`
    navigator.clipboard?.writeText(link)
      .then(() => toast('Guest link copied!', 'success'))
      .catch(() => toast(link)) // clipboard blocked — show it so they can copy manually
  }

  return (
    <div>
      <AppHeader right={<button onClick={signOut} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Sign out</button>} />
      <div className="container" style={{ maxWidth: 720, paddingTop: 36 }}>
        <div className="page-row">
          <div>
            <div className="eyebrow">Host dashboard</div>
            <h1 className="headline" style={{ fontSize: 36 }}>Your events</h1>
          </div>
          <button className="btn" onClick={createEvent}>+ New event</button>
        </div>

        {loading && [0, 1].map((i) => <div key={i} className="skeleton skeleton-card" />)}
        {!loading && events.length === 0 && (
          <div className="empty-state">
            <div className="orb">✦</div>
            <h3>No events yet</h3>
            <p>Create your first one above — you'll get a shareable guest link right away.</p>
          </div>
        )}

        {events.map((ev, i) => (
          <div className="card event-card hoverable stagger-item" style={{ '--d': `${i * 60}ms` }} key={ev.id}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 4 }}>Event</div>
              <h3 style={{ margin: '0 0 6px' }}>{ev.name}</h3>
              <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                <code>{window.location.origin}/e/{ev.slug}</code>{' '}
                <button onClick={() => copyLink(ev.slug)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: 'inherit' }}>
                  Copy
                </button>
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link className="btn btn-outline" to={`/event/${ev.id}/gallery`}>Guest memories</Link>
              <Link className="btn" to={`/event/${ev.id}/edit`}>Manage</Link>
              <button className="btn btn-outline" onClick={() => setQrEvent(ev)}>▦ QR code</button>
              <Link className="btn btn-outline" to={`/event/${ev.id}/slideshow`} target="_blank">🎬 Slideshow</Link>
              <button onClick={() => deleteEvent(ev)} style={{ background: 'none', border: 'none', color: 'crimson', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {qrEvent && (
        <div className="modal-overlay" onClick={() => setQrEvent(null)}>
          <div className="modal-card" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <EventQR event={qrEvent} />
            <div className="modal-actions" style={{ marginTop: 14 }}>
              <button className="btn btn-outline" onClick={() => setQrEvent(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
