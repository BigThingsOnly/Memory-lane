import LandingTemplate from '../components/LandingTemplate.jsx'

export default function Landing({ session }) {
  return (
    <LandingTemplate
      session={session}
      eyebrow="Keep the moments"
      headline={{ lead: 'Every celebration deserves a', emphasis: 'memory lane.' }}
      lede="Guests share photos, videos, voice notes and messages — no account needed. You keep it all in one white-labeled gallery, organized by who sent it, with a live slideshow for the day itself."
      ctaLabel="Create an event"
      crossLinks={[
        { to: '/weddings', label: 'Planning a wedding?' },
        { to: '/tournaments', label: 'Running a tournament or community event?' },
      ]}
      features={[
        { num: '01', title: 'No guest account', desc: 'Guests enter their name and start sharing — no app, no sign-up.' },
        { num: '02', title: 'White-labeled events', desc: 'Every event gets its own link, colors, logo, and welcome message.' },
        { num: '03', title: 'Live memories', desc: 'Uploads can appear instantly on a slideshow projected at the event.' },
      ]}
    />
  )
}
