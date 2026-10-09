import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import AppHeader from '../components/AppHeader.jsx'
import { useToast } from '../components/ToastProvider.jsx'
import { useConfirm } from '../components/ConfirmProvider.jsx'
import EventQR from '../components/EventQR.jsx'

export default function EventEditor() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [galleries, setGalleries] = useState([])
  const [newGalleryName, setNewGalleryName] = useState('')
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [fileInputKey, setFileInputKey] = useState(0) // bump to force the file inputs to visually reset
  const toast = useToast()
  const confirm = useConfirm()

  useEffect(() => { load() }, [id])

  async function load() {
    const [{ data: ev }, { data: gal }] = await Promise.all([
      supabase.from('events').select('*').eq('id', id).single(),
      supabase.from('galleries').select('*').eq('event_id', id).order('sort_order'),
    ])
    setEvent(ev)
    setGalleries(gal || [])
  }

  async function addGallery(e) {
    e.preventDefault()
    const name = newGalleryName.trim()
    if (!name) return
    const { error } = await supabase.from('galleries').insert({
      event_id: id,
      name,
      sort_order: galleries.length,
    })
    if (error) { toast(error.message, 'error'); return }
    setNewGalleryName('')
    load()
  }

  async function deleteGallery(galleryId) {
    const confirmed = await confirm({
      title: 'Delete this segment?',
      message: 'Memories already uploaded to it stay, but move to "General".',
      confirmLabel: 'Delete segment',
      danger: true,
    })
    if (!confirmed) return
    const { error } = await supabase.from('galleries').delete().eq('id', galleryId)
    if (error) { toast(error.message, 'error'); return }
    load()
    toast('Segment removed.', 'success')
  }

  async function uploadBrandingFile(file, kind) {
    // Never embed the raw filename — spaces, non-ASCII characters, or symbols in it
    // can produce a broken storage path/URL. Generate one from the mime type instead.
    const guessedExt = (file.type && file.type.includes('/')) ? file.type.split('/')[1].split('+')[0] : 'jpg'
    const path = `${id}/${kind}-${Date.now()}.${guessedExt || 'jpg'}`
    const { error } = await supabase.storage.from('branding').upload(path, file, {
      contentType: file.type || undefined,
    })
    if (error) throw error
    const { data } = supabase.storage.from('branding').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const updates = {
        name: event.name,
        welcome_message: event.welcome_message,
        accent_color: event.accent_color,
      }
      if (logoFile) updates.logo_url = await uploadBrandingFile(logoFile, 'logo')
      if (coverFile) updates.cover_url = await uploadBrandingFile(coverFile, 'cover')

      const { error } = await supabase.from('events').update(updates).eq('id', id)
      if (error) throw error
      await load()
      setLogoFile(null)
      setCoverFile(null)
      setFileInputKey((k) => k + 1)
      toast('Saved!', 'success')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!event) return <div className="container">Loading…</div>

  return (
    <div>
      <AppHeader right={<Link to="/dashboard">&larr; Dashboard</Link>} />
      <div className="container" style={{ maxWidth: 900, paddingTop: 32 }}>
        <div className="eyebrow">Event editor</div>
        <h1 className="headline" style={{ fontSize: 32, marginBottom: 6 }}>Customize {event.name}</h1>
        <p className="muted" style={{ fontSize: 13, marginBottom: 24 }}>
          Guest link: <code>{window.location.origin}/e/{event.slug}</code>
        </p>

        <div className="editor-grid">
          <div>
            <form onSubmit={handleSave} className="card">
              <label>Event name</label>
              <input
                value={event.name}
                onChange={(e) => setEvent({ ...event, name: e.target.value })}
              />

              <label>Welcome message shown to guests</label>
              <textarea
                rows={3}
                value={event.welcome_message}
                onChange={(e) => setEvent({ ...event, welcome_message: e.target.value })}
              />

              <label>Accent color</label>
              <input
                type="color"
                value={event.accent_color}
                onChange={(e) => setEvent({ ...event, accent_color: e.target.value })}
                style={{ height: 44 }}
              />

              <label>Logo (optional)</label>
              <input key={`logo-${fileInputKey}`} type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} />
              {event.logo_url && <img src={event.logo_url} alt="logo" style={{ height: 60, marginBottom: 12 }} />}

              <label>Cover photo (optional)</label>
              <input key={`cover-${fileInputKey}`} type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files[0])} />
              {event.cover_url && <img src={event.cover_url} alt="cover" style={{ width: '100%', marginBottom: 12, borderRadius: 10 }} />}

              <button className="btn" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </form>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Event segments (optional)</h3>
              <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
                For multi-part events — a welcome party, ceremony, and reception, say.
                Guests pick a segment before uploading, and you can view or present
                each one separately. Leave this empty for a simple, single event.
              </p>

              {galleries.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  {galleries.map((g) => (
                    <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                      <span>{g.name}</span>
                      <button onClick={() => deleteGallery(g.id)} style={{ background: 'none', border: 'none', color: 'crimson', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={addGallery} style={{ display: 'flex', gap: 10 }}>
                <input
                  placeholder="e.g. Reception"
                  value={newGalleryName}
                  onChange={(e) => setNewGalleryName(e.target.value)}
                  style={{ marginBottom: 0 }}
                />
                <button className="btn btn-outline" type="submit" style={{ width: 'auto', whiteSpace: 'nowrap' }}>
                  + Add
                </button>
              </form>
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Guest QR code</h3>
              <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
                Print it on invitations, table cards or a sign at the venue. Guests scan it to open this event's upload page.
              </p>
              <EventQR event={event} />
            </div>
          </div>

          {/* Live preview — reflects unsaved edits immediately, the way a guest will see them */}
          <div className="editor-preview">
            <div className="eyebrow">Live preview — guest view</div>
            <h2 style={{ margin: '0 0 10px', fontSize: 26 }}>{event.name || 'Your event name'}</h2>
            <p style={{ marginBottom: 20 }}>{event.welcome_message || 'Your welcome message will appear here.'}</p>
            <div style={{ display: 'inline-block', padding: '10px 18px', borderRadius: 999, background: event.accent_color, color: '#fff', fontSize: 13, fontWeight: 700, transition: 'background-color 0.25s ease' }}>
              📷 Upload Photo
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
