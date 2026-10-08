import LandingTemplate from '../components/LandingTemplate.jsx'

export default function WeddingsLanding({ session }) {
  return (
    <LandingTemplate
      session={session}
      eyebrow="For weddings & celebrations"
      headline={{ lead: 'Every guest has a photo you', emphasis: "didn't take." }}
      lede="Your photographer gets the posed shots. Your guests get the real ones — the dance floor, the toast, the moment just after. Give them one link to drop it all, and keep it forever in your own gallery."
      ctaLabel="Create your wedding gallery"
      crossLinks={[{ to: '/', label: 'See all features' }, { to: '/tournaments', label: 'Running a tournament instead?' }]}
      features={[
        { num: '01', title: 'One link, shared anywhere', desc: 'Print it on a card, put it on a sign, text it to the group chat — guests just tap and share.' },
        { num: '02', title: 'Segments for every part of the day', desc: 'Keep the traditional/civil ceremony, the reception, and the after-party photos organized separately if you want.' },
        { num: '03', title: 'A keepsake, not just a camera roll', desc: "Memories are grouped by who sent them, so you'll always know it was your cousin who caught that moment." },
      ]}
    />
  )
}
