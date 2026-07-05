import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: '홈', icon: '🏠' },
  { to: '/ledger', label: '내역', icon: '📋' },
  { to: '/settings', label: '설정', icon: '⚙️' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 max-w-md mx-auto bg-white border-t flex">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end
          className={({ isActive }) =>
            `flex-1 py-3 text-center text-xs ${isActive ? 'text-brand font-bold' : 'text-sub'}`
          }>
          <div className="text-xl">{t.icon}</div>
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
