import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import VoiceRecorder from '../components/VoiceRecorder.jsx'
import { useToast } from '../components/ToastProvider.jsx'

export default function GuestUpload() {
  const { slug } = useParams()
  const [event, setEvent] = useState(undefined) // undefined = loading, null = not found
  const [galleries, setGalleries] = useState([])
  const [galleryId, setGalleryId] = useState(null)
  const [guestName, setGuestName] = useState(localStorage.getItem('ml_guest_name') || '')
  const [mode, setMode] = useState(null) // 'photo' | 'video' | 'voice' | 'message'
  const [messageText, setMessageText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [nudge, setNudge] = useState(false) // brief shake on the name field when blocked
  const fileInputRef = useRef(null)
  const pendingTypeRef = useRef('photo')
  const toast = useToast()

  useEffect(() => { loadEvent() }, [slug])

  async function loadEvent() {
    const { data } = await supabase.from('events').select('*').eq('slug', slug).single()
    setEvent(data || null)
    if (data) {
      const { data: gal } = await supabase.from('galleries').select('*').eq('event_id', data.id).order('sort_order')
      setGalleries(gal || [])
    }
  }

  function rememberName(name) {
    setGuestName(name)
    localStorage.setItem('ml_guest_name', name)
  }

  const needsGallerySelection = galleries.length > 0 && !galleryId
  const canUpload = guestName.trim().length > 0 && !needsGallerySelection

  function requireName() {
    if (needsGallerySelection) {
      toast('Please choose which part of the event this is from first.')
      triggerNudge()
      return false
    }
    if (guestName.trim().length === 0) {
      toast('Please enter your name first.')
      triggerNudge()
      return false
    }
    return true
  }

  function triggerNudge() {
    setNudge(true)
    setTimeout(() => setNudge(false), 400)
  }

  function openFilePicker(type) {
    if (!requireName()) return
    pendingTypeRef.current = type
    fileInputRef.current.accept = type === 'video' ? 'video/*' : 'image/*'
    fileInputRef.current.click()
  }

  function extensionFor(file, type) {
    const mime = file.type || ''
    if (mime.includes('/')) {
      const guess = mime.split('/')[1].split(';')[0]
      if (guess) return guess
    }
    return type === 'voice' ? 'webm' : type === 'video' ? 'mp4' : 'jpg'
  }

  async function uploadFile(file, type) {
    if (!requireName()) return
    setUploading(true)
    try {
      const ext = extensionFor(file, type)
      const path = `${event.id}/${type}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('memories').upload(path, file, {
        contentType: file.type || undefined,
      })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('memories').getPublicUrl(path)
      const { error: insErr } = await supabase.from('memories').insert({
        event_id: event.id,
        gallery_id: galleryId,
        type,
        file_url: data.publicUrl,
        guest_name: guestName.trim(),
      })
      if (insErr) throw insErr
      setDone(true)
    } catch (err) {
      toast('Upload failed: ' + err.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  async function submitMessage(e) {
    e.preventDefault()
    if (!requireName()) return
    if (!messageText.trim()) return
    setUploading(true)
    const { error } = await supabase.from('memories').insert({
      event_id: event.id,
      gallery_id: galleryId,
      type: 'message',
      message_text: messageText.trim(),
      guest_name: guestName.trim(),
    })
    setUploading(false)
    if (error) toast(error.message, 'error')
    else setDone(true)
  }

  if (event === undefined) return <div className="guest-wrap" style={{ paddingTop: 60 }}>Loading…</div>
  if (event === null) return <div className="guest-wrap" style={{ paddingTop: 60 }}><h2>Event not found</h2></div>

  const accent = event.accent_color || '#D91E4B'

  if (done) {
    return (
      <div className="guest-wrap" style={{ paddingTop: 60 }}>
        <div className="guest-panel no-cover" style={{ textAlign: 'center' }}>
          <svg width="56" height="56" viewBox="0 0 56 56" style={{ marginBottom: 12 }}>
            <circle cx="28" cy="28" r="26" fill="none" stroke={accent} strokeWidth="2.5" className="check-circle" />
            <path d="M17 29 L24 36 L39 20" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="check-mark" />
          </svg>
          <h2 style={{ color: accent, marginTop: 0 }}>Thank you!</h2>
          <p className="muted">Your memory has been added.</p>
          <button className="btn" style={{ background: accent }} onClick={() => { setDone(false); setMode(null); setMessageText('') }}>
            Add another memory
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="guest-wrap">
      {event.cover_url && (
        <div className="guest-cover" style={{ backgroundImage: `url(${event.cover_url})` }} />
      )}
      <div className={`guest-panel${event.cover_url ? '' : ' no-cover'}`}>
        {event.logo_url && <img src={event.logo_url} alt="" style={{ height: 50, marginBottom: 14 }} />}
        <div className="eyebrow" style={{ color: accent }}>{event.name}</div>
        <h1 className="headline" style={{ fontSize: 30, marginBottom: 10 }}>{event.welcome_message}</h1>
        <p className="muted" style={{ marginBottom: 20, fontSize: 14 }}>
          Your name is required so the host knows who shared each memory.
        </p>

      {galleries.length > 0 && (
        <>
          <label>Which part of the event is this from?</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {galleries.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGalleryId(g.id)}
                className={galleryId === g.id ? 'btn' : 'btn btn-outline'}
                style={{ width: 'auto', padding: '10px 16px', fontSize: 13, background: galleryId === g.id ? accent : undefined, borderColor: accent, color: galleryId === g.id ? '#fff' : accent }}
              >
                {g.name}
              </button>
            ))}
          </div>
        </>
      )}

      <label>Your name (required — memories are filed under your name)</label>
      <input
        placeholder="e.g. Chidinma"
        required
        value={guestName}
        onChange={(e) => rememberName(e.target.value)}
        className={nudge ? 'shake' : ''}
      />
      {needsGallerySelection ? (
        <p style={{ color: '#b00', fontSize: 13, marginTop: -6 }}>Choose a segment above to unlock the options below.</p>
      ) : !canUpload && (
        <p style={{ color: '#b00', fontSize: 13, marginTop: -6 }}>Enter your name to unlock the options below.</p>
      )}

      {!mode && (
        <div className="upload-grid">
          <button className="btn" disabled={!canUpload} style={{ background: accent }} onClick={() => openFilePicker('photo')}>
            📷 Upload Photo
          </button>
          <button className="btn" disabled={!canUpload} style={{ background: accent }} onClick={() => openFilePicker('video')}>
            🎥 Upload Video
          </button>
          <button className="btn" disabled={!canUpload} style={{ background: accent }} onClick={() => { if (requireName()) setMode('voice') }}>
            🎙️ Voice Note
          </button>
          <button className="btn" disabled={!canUpload} style={{ background: accent }} onClick={() => { if (requireName()) setMode('message') }}>
            ✍️ Leave a Message
          </button>
        </div>
      )}

      {/* Hidden file input reused for both photo and video */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files[0]
          e.target.value = ''
          if (!file) return
          uploadFile(file, pendingTypeRef.current)
        }}
      />

      {mode === 'voice' && (
        <>
          <VoiceRecorder accent={accent} onRecorded={(blob) => uploadFile(blob, 'voice')} />
          <button className="btn btn-outline" onClick={() => setMode(null)} style={{ marginTop: 10 }}>Cancel</button>
        </>
      )}

      {mode === 'message' && (
        <form onSubmit={submitMessage}>
          <textarea
            rows={5}
            placeholder="Write your message…"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" style={{ background: accent }} type="submit" disabled={uploading}>
              {uploading ? 'Sending…' : 'Send message'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setMode(null)}>Cancel</button>
          </div>
        </form>
      )}

      {uploading && mode !== 'message' && (
        <div style={{ marginTop: 14 }}>
          <div className="progress-track"><div className="progress-fill" style={{ background: accent }} /></div>
          <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>Uploading…</p>
        </div>
      )}
      </div>
    </div>
  )
}
