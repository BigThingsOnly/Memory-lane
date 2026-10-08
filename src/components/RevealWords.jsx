// Splits text into <span class="word"> pieces so each word can animate in with its own delay.
export default function RevealWords({ text, startDelay = 0, stepMs = 45 }) {
  const words = text.split(' ')
  return words.map((w, i) => (
    <span key={i} className="word" style={{ animationDelay: `${startDelay + i * stepMs}ms` }}>
      {w}{i < words.length - 1 ? '\u00A0' : ''}
    </span>
  ))
}
