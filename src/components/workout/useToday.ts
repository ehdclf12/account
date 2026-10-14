import { useEffect, useState } from 'react'
import { todayISO } from '@/lib/date'

const TICK_MS = 60_000

/** 오늘 날짜(로컬). PWA를 밤새 열어 둬도 바뀌도록 화면 복귀(visible) 때와 1분마다 다시 계산한다. */
export function useToday(): string {
  const [today, setToday] = useState(todayISO)
  useEffect(() => {
    const refresh = () => setToday(todayISO())
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)
    const id = setInterval(refresh, TICK_MS)
    return () => { document.removeEventListener('visibilitychange', onVisible); clearInterval(id) }
  }, [])
  return today
}
