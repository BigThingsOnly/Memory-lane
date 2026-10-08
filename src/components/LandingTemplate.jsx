import { Link } from 'react-router-dom'
import AppHeader from './AppHeader.jsx'
import RevealWords from './RevealWords.jsx'

/**
 * headline: { lead: string, emphasis: string } — "lead" reveals first, "emphasis" (italic) follows
 * lede: string — the paragraph under the headline
 * ctaLabel: string — label for the signed-out primary button (signed-in always says "Go to my events")
 * features: [{ num: '01', title, desc }]
 * crossLinks: [{ to, label }] — optional, shown as small links beneath the CTAs (e.g. to other landing variants)
 */
export default function LandingTemplate({ session, eyebrow, headline, lede, ctaLabel, features, crossLinks }) {
  return (
    <div>
      <AppHeader right={<Link to={session ? '/dashboard' : '/login'}>{session ? 'Dashboard' : 'Host login'}</Link>} />
      <main className="hero">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="headline">
          <RevealWords text={headline.lead} />{' '}
          <em><RevealWords text={headline.emphasis} startDelay={320} /></em>
        </h1>
        <p className="lede">{lede}</p>
        <div className="actions">
          <Link className="btn" to={session ? '/dashboard' : '/login'}>
            {session ? 'Go to my events' : ctaLabel}
          </Link>
          {!session && <Link className="btn btn-outline" to="/login">Host login</Link>}
        </div>

        {crossLinks && crossLinks.length > 0 && (
          <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
            {crossLinks.map((c, i) => (
              <span key={c.to}>
                {i > 0 && ' · '}
                <Link to={c.to} style={{ textDecoration: 'underline' }}>{c.label}</Link>
              </span>
            ))}
          </p>
        )}

        <div className="feature-grid">
          {features.map((f, i) => (
            <div key={f.num} className="card hoverable stagger-item" style={{ '--d': `${i * 90}ms` }}>
              <small>{f.num}</small>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
