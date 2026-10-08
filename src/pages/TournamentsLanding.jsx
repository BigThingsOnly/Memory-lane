import LandingTemplate from '../components/LandingTemplate.jsx'

export default function TournamentsLanding({ session }) {
  return (
    <LandingTemplate
      session={session}
      eyebrow="For tournaments & community events"
      headline={{ lead: 'Every match has a moment', emphasis: 'worth keeping.' }}
      lede="Players, parents, and fans all have their phones out anyway. Give your league or tournament one link where every goal, every trophy lift, and every sideline moment lands in one place — organized by matchday if you want it to be."
      ctaLabel="Create your event gallery"
      crossLinks={[{ to: '/', label: 'See all features' }, { to: '/weddings', label: 'Planning a wedding instead?' }]}
      features={[
        { num: '01', title: 'Built for match days', desc: 'Use segments to split a season finale into group stage, semis, and final — each with its own uploads.' },
        { num: '02', title: 'No app for players or parents', desc: 'One link from a poster, a group chat, or a QR code at the gate — no download, no sign-up.' },
        { num: '03', title: 'A live screen for the venue', desc: "Project the slideshow at the event itself — every new photo appears the moment it's sent." },
      ]}
    />
  )
}
