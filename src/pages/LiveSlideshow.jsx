import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const PHOTO_MS = 6000
const MESSAGE_MS = 7000
const FALLBACK_MS = 15000 // safety timeout for video/voice in case onEnded never fires

export default function LiveSlideshow() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const galleryFilter = searchParams.get('gallery') // null = show every segment
  const [event, setEvent] = useState(null)
  const [galleryName, setGalleryName] = useState(null)
  const [slides, setSlides] = useState([])
  const [index, setIndex] = useState(0)
  const [justArrived, setJustArrived] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const slidesLenRef = useRef(0)

  useEffect(() => { slidesLenRef.current = slides.length }, [slides])

  useEffect(() => {
    let channel
    async function init() {
      const { data: ev } = await supabase.from('events').select('*').eq('id', id).single()
      setEvent(ev)

      if (galleryFilter) {
        const { data: gal } = await supabase.from('galleries').select('name').eq('id', galleryFilter).single()
        setGalleryName(gal?.name || null)
      }

      let query = supabase.from('memories').select('*').eq('event_id', id)
      if (galleryFilter) query = query.eq('gallery_id', galleryFilter)
      const { data: mem } = await query.order('created_at', { ascending: true })
      setSlides(mem || [])

      channel = supabase
        .channel(`slideshow-${id}-${galleryFilter || 'all'}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'memories', filter: `event_id=eq.${id}` },
          (payload) => {
            if (galleryFilter && payload.new.gallery_id !== galleryFilter) return // not in this segment
            setSlides((prev) => {
              const next = [...prev, payload.new]
              setIndex(next.length - 1) // jump straight to the new arrival — the "reveal"
              setJustArrived(true)
              return next
            })
          }
        )
        .subscribe()
    }
    init()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [id, galleryFilter])

  useEffect(() => {
    function onFsChange() { setIsFullscreen(!!document.fullscreenElement) }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  function advance() {
    setJustArrived(false)
    setIndex((i) => (slidesLenRef.current === 0 ? 0 : (i + 1) % slidesLenRef.current))
  }

  // Auto-advance for photo and message slides. Video/voice advance on their own via onEnded.
  useEffect(() => {
    if (slides.length === 0) return
    const current = slides[index]
    if (!current) return
    if (current.type === 'photo') {
      const t = setTimeout(advance, PHOTO_MS)
      return () => clearTimeout(t)
    }
    if (current.type === 'message') {
      const t = setTimeout(advance, MESSAGE_MS)
      return () => clearTimeout(t)
    }
    // photo/video/voice fallback in case media never fires onEnded
    const t = setTimeout(advance, FALLBACK_MS)
    return () => clearTimeout(t)
  }, [index, slides.length])

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen()
  }

  if (!event) return <div style={{ background: '#000', height: '100vh' }} />

  const current = slides[index]
  const accent = event.accent_color || '#D91E4B'

  return (
    <div style={styles.stage}>
      <div style={styles.topBar}>
        {event.logo_url && <img src={event.logo_url} alt="" style={{ height: 34 }} />}
        <span style={{ color: '#fff', opacity: 0.7, fontSize: 14, fontWeight: 600 }}>
          {event.name}{galleryName ? ` — ${galleryName}` : ''}
        </span>
        <div style={{ flex: 1 }} />
        {!isFullscreen && (
          <>
            <Link to={`/event/${id}/gallery`} style={styles.exitLink}>Exit</Link>
            <button onClick={toggleFullscreen} style={styles.fsBtn}>⛶ Fullscreen</button>
          </>
        )}
      </div>

      {slides.length === 0 && (
        <div style={styles.empty}>
          <p style={{ fontSize: 22 }}>Waiting for the first memory…</p>
          <p style={{ opacity: 0.6 }}>This screen updates live as guests upload.</p>
        </div>
      )}

      {current && (
        <div key={current.id} style={styles.slideWrap} className={justArrived ? 'reveal' : 'fade'}>
          {justArrived && (
            <div style={{ ...styles.newBadge, background: accent }}>✨ Just in from {current.guest_name}</div>
          )}

          {current.type === 'photo' && (
            <div style={styles.kenburnsFrame}>
              <img
                key={current.id}
                src={current.file_url}
                alt=""
                className={index % 2 === 0 ? 'kenburns kenburns-a' : 'kenburns kenburns-b'}
              />
            </div>
          )}

          {current.type === 'video' && (
            <video
              key={current.id}
              src={current.file_url}
              autoPlay
              onEnded={advance}
              style={styles.media}
            />
          )}

          {current.type === 'voice' && (
            <div style={styles.voiceWrap}>
              <div className="waveform">
                {Array.from({ length: 20 }).map((_, i) => (
                  <span key={i} style={{ background: accent, animationDelay: `${(i % 7) * 0.09}s` }} />
                ))}
              </div>
              <div style={{ fontSize: 36, marginTop: 16 }}>🎙️</div>
              <audio key={current.id} src={current.file_url} autoPlay onEnded={advance} />
            </div>
          )}

          {current.type === 'message' && (
            <div style={styles.messageWrap}>
              <div style={{ fontSize: 50, color: accent, lineHeight: 0.5 }}>&ldquo;</div>
              <p style={styles.messageText}>{current.message_text}</p>
              <p style={styles.caption}>— {current.guest_name}</p>
            </div>
          )}

          {current.type !== 'message' && (
            <p style={styles.caption}>{current.guest_name}</p>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes revealIn { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
        .fade { animation: fadeIn 0.9s cubic-bezier(0.22, 1, 0.36, 1); }
        .reveal { animation: revealIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }

        .kenburns { width: 100%; height: 100%; object-fit: cover; display: block;
          animation-duration: 6.5s; animation-timing-function: linear; animation-fill-mode: forwards; }
        .kenburns-a { animation-name: kenburnsA; }
        .kenburns-b { animation-name: kenburnsB; }
        @keyframes kenburnsA { from { transform: scale(1) translate(0, 0); } to { transform: scale(1.12) translate(-2%, -1%); } }
        @keyframes kenburnsB { from { transform: scale(1.12) translate(-2%, 1%); } to { transform: scale(1) translate(0, 0); } }

        .waveform { display: flex; align-items: center; gap: 5px; height: 90px; }
        .waveform span { width: 6px; border-radius: 3px; height: 18%; animation: waveBounce 0.9s ease-in-out infinite; }
        @keyframes waveBounce { 0%, 100% { height: 18%; } 50% { height: 100%; } }
      `}</style>
    </div>
  )
}

const styles = {
  stage: {
    background: '#000', height: '100vh', width: '100vw', display: 'flex',
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    position: 'fixed', inset: 0, overflow: 'hidden',
  },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center',
    gap: 12, padding: '14px 20px', zIndex: 3,
  },
  exitLink: { color: '#fff', opacity: 0.7, fontSize: 13, textDecoration: 'none' },
  fsBtn: { background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer' },
  empty: { color: '#fff', textAlign: 'center' },
  slideWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', maxWidth: '90vw', maxHeight: '90vh', position: 'relative' },
  media: { maxWidth: '88vw', maxHeight: '78vh', borderRadius: 14, objectFit: 'contain', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' },
  kenburnsFrame: { width: '80vw', height: '70vh', borderRadius: 14, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' },
  caption: { color: '#fff', opacity: 0.85, marginTop: 18, fontSize: 20, fontWeight: 600 },
  newBadge: { position: 'absolute', top: -50, color: '#fff', padding: '8px 18px', borderRadius: 20, fontSize: 14, fontWeight: 700 },
  voiceWrap: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 260, height: 220 },
  messageWrap: { maxWidth: '70vw', textAlign: 'center' },
  messageText: { color: '#fff', fontSize: 40, fontStyle: 'italic', lineHeight: 1.4, fontWeight: 500, fontFamily: "'Fraunces', Georgia, serif" },
}
