import { useEffect } from 'react'
import { MENU } from '@/lib/menu'

interface Props {
  open: boolean
  current: string
  userName: string
  onClose: () => void
  onNavigate: (to: string) => void
  onLogout: () => void
}

// 대시보드 ☰로 여는 왼쪽 메뉴바. 항목·바깥·Esc로 닫힌다.
export default function SideMenu({ open, current, userName, onClose, onNavigate, onLogout }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div data-testid="side-menu-backdrop" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <nav aria-label="메뉴"
        className="side-menu absolute inset-y-0 left-0 w-64 max-w-[80vw] bg-[#0b1118] border-r border-white/10 flex flex-col"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)' }}>
        <div className="px-5 pt-5 pb-3 font-mono text-xs tracking-widest text-[#9fb3c2]">MENU</div>
        <ul className="flex-1 px-3 space-y-1">
          {MENU.map((m) => {
            const active = m.to === current
            return (
              <li key={m.to}>
                <button onClick={() => { onClose(); onNavigate(m.to) }} aria-current={active ? 'page' : undefined}
                  className={`w-full text-left rounded-xl px-3 py-3 min-h-[44px] active:opacity-70 ${active ? 'bg-white/10' : ''}`}>
                  <span className="block font-bold text-[#F2F7FF]">{m.label}</span>
                  <span className="block text-xs text-[#9fb3c2] mt-0.5">{m.desc}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <div className="px-5 py-4 text-sm text-[#9fb3c2] border-t border-white/10">
          {userName}님 · <button onClick={onLogout} className="text-[#7fe8ff] font-medium">로그아웃</button>
        </div>
      </nav>
    </div>
  )
}
