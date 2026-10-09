import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useToast } from './ToastProvider.jsx'

/**
 * Shows a scannable QR code for an event's guest link, plus Download / Print / Copy actions.
 * The QR is always dark-on-white (not the event's accent color) so it scans reliably.
 */
export default function EventQR({ event }) {
  const [dataUrl, setDataUrl] = useState('')
  const toast = useToast()

  const link = `${window.location.origin}/e/${event.slug}`
  const isLocal = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
  const accent = event.accent_color || '#D91E4B'

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(link, {
      width: 1024,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#17151a', light: '#ffffff' },
    })
      .then((url) => { if (!cancelled) setDataUrl(url) })
      .catch(() => toast('Could not generate the QR code.', 'error'))
    return () => { cancelled = true }
  }, [link])

  function download() {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${event.slug}-qr.png`
    a.click()
  }

  function copyLink() {
    navigator.clipboard?.writeText(link)
      .then(() => toast('Guest link copied!', 'success'))
      .catch(() => toast(link))
  }

  return (
    <div>
      {isLocal && (
        <div className="notice" style={{ marginBottom: 14, fontSize: 13 }}>
          You're on <strong>localhost</strong>, so this QR code only works on this computer.
          Open your live site and generate it there to get one guests can actually scan.
        </div>
      )}

      {/* This sheet is what gets printed — everything else on the page is hidden while printing. */}
      <div className="qr-print-sheet">
        <div className="qr-sheet-title">{event.name}</div>
        <div className="qr-sheet-bar" style={{ background: accent }} />
        <div className="qr-sheet-sub">Scan to share your photos, videos, voice notes and messages</div>
        {dataUrl
          ? <img className="qr-img" src={dataUrl} alt={`QR code for ${event.name}`} />
          : <div className="skeleton qr-img" />}
        <div className="qr-sheet-link">{link}</div>
      </div>

      <div className="qr-actions">
        <button className="btn" onClick={download} disabled={!dataUrl}>⬇ Download PNG</button>
        <button className="btn btn-outline" onClick={() => window.print()} disabled={!dataUrl}>🖨 Print</button>
        <button className="btn btn-outline" onClick={copyLink}>Copy link</button>
      </div>
    </div>
  )
}
