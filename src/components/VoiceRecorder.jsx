import { useRef, useState } from 'react'

function pickSupportedMimeType() {
  const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg']
  for (const type of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }
  return '' // let the browser choose its own default
}

export default function VoiceRecorder({ onRecorded, accent }) {
  const [recording, setRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [error, setError] = useState('')
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  async function startRecording() {
    setError('')
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setError('Voice recording isn\'t supported in this browser — try Upload Photo/Video instead, or a different browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = pickSupportedMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' })
        setAudioUrl(URL.createObjectURL(blob))
        onRecorded(blob)
        stream.getTracks().forEach((t) => t.stop())
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
    } catch (err) {
      setError('Couldn\'t access the microphone — please allow microphone access and try again.')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  return (
    <div className="card">
      <p>Record a voice message</p>
      {!recording && (
        <button className="btn" style={{ background: accent }} onClick={startRecording}>
          🎙️ Start recording
        </button>
      )}
      {recording && (
        <button className="btn" style={{ background: '#333' }} onClick={stopRecording}>
          ⏹ Stop recording
        </button>
      )}
      {audioUrl && <audio src={audioUrl} controls style={{ marginTop: 12, width: '100%' }} />}
      {error && <p style={{ color: 'crimson', fontSize: 13, marginTop: 10 }}>{error}</p>}
    </div>
  )
}
