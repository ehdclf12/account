import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { todayISO } from '@/lib/date'
import { addDays, buildDashboard, formatClock, type Domain } from '@/lib/dashboard'
import { useArchiveItems } from '@/hooks/useArchive'
import { useTimeBlocks, useTimeSessions } from '@/hooks/useTimeBlocks'
import { useTimeGoals } from '@/hooks/useTimeGoals'
import { useHolidays } from '@/hooks/useHolidays'
import Nebula from '@/components/dashboard/Nebula'
import SideMenu from '@/components/SideMenu'
import { useIdentity } from '@/App'
import { NAME_BY_ROLE } from '@/lib/users'

export default function HomeMenuScreen() {
  const nav = useNavigate()

  // 진행 중 기록 시간과 상단 시계를 매 분 정각에 맞춰 갱신하고, 앱으로 돌아오면 바로 갱신한다
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined
    const tick = () => setNowMs(Date.now())
    const first = setTimeout(() => {
      tick()
      interval = setInterval(tick, 60_000)
    }, 60_000 - (Date.now() % 60_000))
    const onVisible = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(first)
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const today = todayISO()
  const years = [...new Set([today, addDays(today, 14)].map((d) => Number(d.slice(0, 4))))]
  const holidays = useHolidays(years)
  const items = useArchiveItems()
  const sessions = useTimeSessions()
  const blocks = useTimeBlocks()
  const goals = useTimeGoals()

  const dash = buildDashboard({
    items: items.data ?? [], sessions: sessions.data ?? [], blocks: blocks.data ?? [],
    goals: goals.data ?? [], holidays, todayISO: today, nowMs,
  })
  // 로딩 중에 '비어 있어요'가 번쩍이지 않게, 전부 받아온 뒤에만 빈 상태로 본다
  const loaded = [items, sessions, blocks, goals].every((q) => q.isSuccess)
  const timeFailed = sessions.isError || blocks.isError || goals.isError
  const failed: Partial<Record<Domain, boolean>> = {
    deadline: items.isError, calendar: items.isError, archive: items.isError, time: timeFailed,
  }

  const who = useIdentity()
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  function logout() {
    if (window.confirm('로그아웃할까요?')) supabase.auth.signOut()
  }

  // 홈은 화면 전체를 쓴다: 위 막대 아래 남은 높이를 그래프가 채우고, 노치·홈 표시줄 자리(safe area)는 비운다
  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% 48%, #06121c 0%, #000 70%)',
        paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)',
      }}>
      <div className="shrink-0 flex items-center justify-between px-4 pt-4 pb-1 font-mono text-xs text-[#9fb3c2]">
        <span className="flex items-center gap-2">
          <button onClick={() => setMenuOpen(true)} aria-label="메뉴 열기" className="text-lg min-w-[44px] min-h-[44px] -my-3 -ml-3 flex items-center justify-center active:opacity-60">☰</button>
          <span>{formatClock(nowMs)}</span>
        </span>
        <span className="flex items-center gap-3">
          <span className="text-[#7fe8ff]">● LIVE</span>
          <button onClick={logout} aria-label="로그아웃" className="text-base min-w-[44px] min-h-[44px] -my-3 -mr-3 flex items-center justify-center active:opacity-60">⏻</button>
        </span>
      </div>
      <SideMenu open={menuOpen} current="/" userName={NAME_BY_ROLE[who]} onClose={closeMenu} onNavigate={(to) => nav(to)} onLogout={logout} />
      <div className="flex-1 min-h-0">
        <Nebula dash={{ ...dash, empty: dash.empty && loaded }} failed={failed} onNavigate={(href) => nav(href)} />
      </div>
    </div>
  )
}
