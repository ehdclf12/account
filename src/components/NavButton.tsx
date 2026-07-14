import { useNavigate } from 'react-router-dom'

export default function NavButton({ to, label }: { to: string; label: string }) {
  const nav = useNavigate()
  return (
    <button onClick={() => nav(to)}
      className="bg-card text-ink rounded-full px-3 py-1.5 text-sm font-medium shrink-0 active:opacity-70">
      ‹ {label}
    </button>
  )
}
