import { Link } from 'react-router-dom'

export function BrandMark() {
  return (
    <svg className="brand-mark" width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="9.5" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="14.5" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export default function AppHeader({ right }) {
  return (
    <header className="app-header">
      <Link to="/" className="brand"><BrandMark />Memory<span>Lane</span></Link>
      <nav>{right}</nav>
    </header>
  )
}
