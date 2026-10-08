import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Landing from './pages/Landing.jsx'
import WeddingsLanding from './pages/WeddingsLanding.jsx'
import TournamentsLanding from './pages/TournamentsLanding.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import EventEditor from './pages/EventEditor.jsx'
import HostGallery from './pages/HostGallery.jsx'
import LiveSlideshow from './pages/LiveSlideshow.jsx'
import GuestUpload from './pages/GuestUpload.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import { ToastProvider } from './components/ToastProvider.jsx'
import { ConfirmProvider } from './components/ConfirmProvider.jsx'

function NotFound() {
  return (
    <div className="container" style={{ textAlign: 'center', paddingTop: 80 }}>
      <div className="eyebrow">404</div>
      <h1 className="headline" style={{ fontSize: 32, marginBottom: 10 }}>Page not found</h1>
      <p className="muted" style={{ marginBottom: 20 }}>That link doesn't match anything here — double-check it, or head back home.</p>
      <a className="btn" href="/">Go home</a>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) return null // brief loading flash, nothing to show yet

  return (
    <ToastProvider>
      <ConfirmProvider>
        <Routes>
          <Route path="/" element={<Landing session={session} />} />
          <Route path="/weddings" element={<WeddingsLanding session={session} />} />
          <Route path="/tournaments" element={<TournamentsLanding session={session} />} />
          <Route path="/login" element={session ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/dashboard" element={session ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/event/:id/edit" element={session ? <EventEditor /> : <Navigate to="/login" />} />
          <Route path="/event/:id/gallery" element={session ? <HostGallery /> : <Navigate to="/login" />} />
          <Route path="/event/:id/slideshow" element={session ? <LiveSlideshow /> : <Navigate to="/login" />} />
          {/* Requires sign-in to reach at all; AdminDashboard itself checks real admin membership */}
          <Route path="/admin" element={session ? <AdminDashboard /> : <Navigate to="/login" />} />
          {/* Public guest-facing page — no login required */}
          <Route path="/e/:slug" element={<GuestUpload />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ConfirmProvider>
    </ToastProvider>
  )
}
