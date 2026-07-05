import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: '홈' },
  { to: '/ledger', label: '내역' },
  { to: '/business', label: '사업' },
  { to: '/settings', label: '설정' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 max-w-md mx-auto bg-white border-t border-card flex">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end
          className={({ isActive }) =>
            `flex-1 py-4 text-center text-sm ${isActive ? 'text-ink font-bold' : 'text-sub font-medium'}`
          }>
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
