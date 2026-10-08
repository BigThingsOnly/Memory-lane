import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import JSZip from 'jszip'
import { supabase } from '../supabaseClient'
import AppHeader from '../components/AppHeader.jsx'
import { useToast } from '../components/ToastProvider.jsx'
import { useConfirm } from '../components/ConfirmProvider.jsx'

const TYPE_LABELS = { photo: 'Photos', video: 'Videos', voice: 'Voice Notes', message: 'Messages' }
const TYPE_ORDER = ['photo', 'video', 'voice', 'message']

function safeName(s) {
  return (s || 'file').replace(/[^a-z0-9-_]+/gi, '_').slice(0, 60)
}

export default function HostGallery() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [galleries, setGalleries] = useState([])
  const [activeGallery, setActiveGallery] = useState('all') // 'all' | gallery id
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)
  const [openFolder, setOpenFolder] = useState(null) // sender name currently open, or null
  const [closing, setClosing] = useState(false)
  const [zipping, setZipping] = useState(false)
  const [isOwner, setIsOwner] = useState(true) // false when an admin is viewing someone else's event
  const toast = useToast()
  const confirm = useConfirm()

  useEffect(() => {
    setActiveGallery('all')
    setOpenFolder(null)
    load()
  }, [id])

  async function load() {
    setLoading(true)
    const [{ data: { user } }, { data: ev }, { data: gal }, { data: mem }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('events').select('*').eq('id', id).single(),
      supabase.from('galleries').select('*').eq('event_id', id).order('sort_order'),
      supabase.from('memories').select('*').eq('event_id', id).order('created_at', { ascending: false }),
    ])
    setEvent(ev)
    setIsOwner(!!ev && !!user && ev.host_id === user.id)
    setGalleries(gal || [])
    setMemories(mem || [])
    setLoading(false)
  }

  async function deleteMemory(memId) {
    const confirmed = await confirm({ message: 'Delete this memory? This can\'t be undone.', confirmLabel: 'Delete', danger: true })
    if (!confirmed) return
    const { error } = await supabase.from('memories').delete().eq('id', memId)
    if (error) toast(error.message, 'error')
    else { setMemories(memories.filter((m) => m.id !== memId)); toast('Memory deleted.', 'success') }
  }

  // Filter to the selected segment (or everything, for events with no segments / "All" tab).
  const filtered = activeGallery === 'all' ? memories : memories.filter((m) => m.gallery_id === activeGallery)

  // One folder per sender within the current filter, most recent sender activity first.
  const folders = []
  const folderIndex = {}
  for (const m of filtered) {
    const key = (m.guest_name || 'Unnamed').trim() || 'Unnamed'
    if (!(key in folderIndex)) {
      folderIndex[key] = folders.length
      folders.push({ name: key, items: [] })
    }
    folders[folderIndex[key]].items.push(m)
  }

  function closeFolder() {
    setClosing(true)
    setTimeout(() => { setOpenFolder(null); setClosing(false) }, 180)
  }

  function folderCover(items) {
    const photo = items.find((m) => m.type === 'photo')
    if (photo) return { kind: 'photo', url: photo.file_url }
    const video = items.find((m) => m.type === 'video')
    if (video) return { kind: 'video', url: video.file_url }
    const icon = items[0]?.type === 'voice' ? '🎙️' : items[0]?.type === 'message' ? '✍️' : '📁'
    return { kind: 'icon', icon }
  }

  async function downloadZip(items, zipName) {
    if (items.length === 0) { toast('Nothing to download here yet.'); return }
    setZipping(true)
    try {
      const zip = new JSZip()
      for (const m of items) {
        const label = `${safeName(m.guest_name)}-${m.type}-${m.id.slice(0, 6)}`
        if (m.type === 'message') {
          zip.file(`${label}.txt`, m.message_text || '')
          continue
        }
        if (!m.file_url) continue
        const res = await fetch(m.file_url)
        const blob = await res.blob()
        const ext = (m.file_url.split('.').pop() || 'dat').split('?')[0]
        zip.file(`${label}.${ext}`, blob)
      }
      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = `${zipName}.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast('Download ready.', 'success')
    } catch (err) {
      toast('Download failed: ' + err.message, 'error')
    } finally {
      setZipping(false)
    }
  }

  const active = folders.find((f) => f.name === openFolder)
  const activeGalleryName = activeGallery === 'all' ? (event?.name || 'event') : (galleries.find((g) => g.id === activeGallery)?.name || 'segment')

  return (
    <div>
      <AppHeader right={<Link to="/dashboard">&larr; Dashboard</Link>} />
      <div className="container" style={{ maxWidth: 720, paddingTop: 28 }}>
      <div className="page-row" style={{ marginBottom: 4 }}>
        <div>
          <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Memories
            {!isOwner && (
              <span style={{ background: '#3d2f6b', color: '#d9cfff', padding: '2px 8px', borderRadius: 999, fontSize: 10, letterSpacing: '0.02em' }}>
                🛡 Admin view — read only
              </span>
            )}
          </div>
          <h1 className="headline" style={{ fontSize: 32 }}>{event?.name || 'Loading…'}</h1>
        </div>
        <Link
          className="btn"
          to={activeGallery === 'all' ? `/event/${id}/slideshow` : `/event/${id}/slideshow?gallery=${activeGallery}`}
          target="_blank"
          style={{ fontSize: 13, padding: '10px 16px' }}
        >
          🎬 Present slideshow
        </Link>
      </div>
      <p className="muted" style={{ marginBottom: 20 }}>{filtered.length} memories from {folders.length} guests</p>

      {galleries.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <button
            className={activeGallery === 'all' ? 'btn' : 'btn btn-outline'}
            onClick={() => { setActiveGallery('all'); setOpenFolder(null) }}
            style={{ width: 'auto', padding: '8px 14px', fontSize: 13 }}
          >
            All
          </button>
          {galleries.map((g) => (
            <button
              key={g.id}
              className={activeGallery === g.id ? 'btn' : 'btn btn-outline'}
              onClick={() => { setActiveGallery(g.id); setOpenFolder(null) }}
              style={{ width: 'auto', padding: '8px 14px', fontSize: 13 }}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="folder-grid">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton skeleton-folder" />)}
        </div>
      )}
      {!loading && folders.length === 0 && (
        <div className="empty-state">
          <div className="orb">✦</div>
          <h3>Your memories will live here.</h3>
          <p>Share the guest link and uploads will be grouped by sender and memory type.</p>
        </div>
      )}

      {!active && !loading && filtered.length > 0 && (
        <button className="btn btn-outline" disabled={zipping} onClick={() => downloadZip(filtered, safeName(activeGalleryName))} style={{ marginBottom: 16 }}>
          {zipping ? 'Preparing zip…' : `⬇ Download all (${filtered.length})`}
        </button>
      )}

      {!active && (
        <div className="folder-grid">
          {folders.map((f, i) => {
            const cover = folderCover(f.items)
            return (
              <button key={f.name} className="folder-card stagger-item" style={{ '--d': `${i * 50}ms` }} onClick={() => setOpenFolder(f.name)}>
                <div className="folder-thumb">
                  {cover.kind === 'photo' && <img src={cover.url} alt="" />}
                  {cover.kind === 'video' && <video src={cover.url} muted playsInline />}
                  {cover.kind === 'icon' && (
                    <div className="folder-thumb-icon">
                      <span className="badge-circle" style={{ fontSize: 22 }}>{cover.icon}</span>
                    </div>
                  )}
                  <div className="folder-overlay">
                    <span className="folder-name">{f.name}</span>
                    <span className="folder-count">{f.items.length}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {active && (
        <div className={`folder-detail ${closing ? 'closing' : 'opening'}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <button className="btn btn-outline" onClick={closeFolder} style={{ width: 'auto' }}>
              &larr; All senders
            </button>
            <button className="btn btn-outline" disabled={zipping} onClick={() => downloadZip(active.items, safeName(active.name))} style={{ width: 'auto', fontSize: 13 }}>
              {zipping ? 'Preparing…' : '⬇ Download folder'}
            </button>
          </div>
          <h3 style={{ margin: '0 0 4px' }}>📂 {active.name}</h3>
          <p style={{ color: '#888', fontSize: 13, marginTop: 0 }}>{active.items.length} item{active.items.length !== 1 ? 's' : ''}</p>

          {TYPE_ORDER.map((type) => {
            const items = active.items.filter((m) => m.type === type)
            if (items.length === 0) return null
            return (
              <div key={type} style={{ marginTop: 18 }}>
                <h4 style={{ marginBottom: 8, color: '#666', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {TYPE_LABELS[type]} ({items.length})
                </h4>
                <div className="gallery-grid">
                  {items.map((m, i) => (
                    <div
                      className="card stagger-item"
                      key={m.id}
                      style={{ gridColumn: type === 'message' || type === 'voice' ? 'span 2' : 'auto', '--d': `${i * 40}ms` }}
                    >
                      {m.type === 'photo' && <img src={m.file_url} alt="" />}
                      {m.type === 'video' && <video src={m.file_url} controls />}
                      {m.type === 'voice' && <audio src={m.file_url} controls style={{ width: '100%' }} />}
                      {m.type === 'message' && <p style={{ fontStyle: 'italic' }}>"{m.message_text}"</p>}
                      {isOwner && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                          <button onClick={() => deleteMemory(m.id)} style={{ background: 'none', border: 'none', color: 'crimson', cursor: 'pointer', fontSize: 12 }}>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}
