import { useEffect, useState } from 'react'
import { useSessionsInRange, useTimeBlocks } from '@/hooks/useTimeBlocks'
import { dailyTotals, heatLevel, elapsedSeconds, formatDuration } from '@/lib/time'
import BlockIcon from '@/components/BlockIcon'
import type { DayCell } from '@/lib/calendar'

// 0~4 단계. 0은 빈 칸이라 아주 옅게, 4는 브랜드색 원본.
const LEVEL_CLS = [
  'bg-line/40',
  'bg-brand/20',
  'bg-brand/40',
  'bg-brand/65',
  'bg-brand',
] as const

export default function TimeHeatmap(
  { cells, selected, onSelect, today }:
  { cells: DayCell[]; selected: string; onSelect: (iso: string) => void; today: string },
) {
  const from = cells[0].iso
  const toExclusive = addDaysISO(cells[cells.length - 1].iso, 1)
  const { data: sessions = [] } = useSessionsInRange(from, toExclusive)
  const { data: blocks = [] } = useTimeBlocks()

  const running = sessions.some((s) => s.ended_at === null)
  // 진행 중일 때만 1초마다 다시 그린다(오늘 칸이 실시간으로 차오르도록)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [running])

  const byDay = dailyTotals(sessions, now)
  const blockById = new Map(blocks.map((b) => [b.id, b]))

  // 선택한 날의 블럭별 내역
  const dayTotals = new Map<string, number>()
  for (const s of sessions) {
    if (localISO(new Date(s.started_at)) !== selected) continue
    dayTotals.set(s.block_id, (dayTotals.get(s.block_id) ?? 0) + elapsedSeconds(s, now))
  }
  const detail = [...dayTotals.entries()]
    .map(([id, secs]) => ({ block: blockById.get(id), secs }))
    .filter((d) => d.block)
    .sort((a, b) => b.secs - a.secs)

  const selectedTotal = byDay[selected] ?? 0

  return (
    <>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c) => {
          const secs = byDay[c.iso] ?? 0
          const level = heatLevel(secs)
          const isToday = c.iso === today
          const isSel = c.iso === selected
          return (
            <button key={c.iso} onClick={() => onSelect(c.iso)}
              className={`flex flex-col items-center gap-1 py-1 rounded-lg active:opacity-70 ${isSel ? 'bg-brand/10' : ''}`}>
              <span className={`w-7 h-7 rounded-lg ${LEVEL_CLS[level]} ${c.inMonth ? '' : 'opacity-30'}`} />
              <span className={`text-[11px] leading-none ${
                isToday ? 'bg-ink text-bg rounded-full px-1.5 py-0.5 font-bold'
                  : c.inMonth ? 'text-sub' : 'text-sub/40'}`}>
                {c.day}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-end gap-1.5 pt-1">
        <span className="text-sub text-[10px]">적음</span>
        {LEVEL_CLS.map((cls, i) => <span key={i} className={`w-3 h-3 rounded ${cls}`} />)}
        <span className="text-sub text-[10px]">많음</span>
      </div>

      <div className="border-t border-line pt-4 space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold text-ink">{selected.slice(5).replace('-', '월 ')}일</h2>
          <span className="text-sub text-sm">{formatDuration(selectedTotal)}</span>
        </div>
        {detail.length === 0 ? (
          <p className="text-sub text-sm py-4">기록이 없어요</p>
        ) : (
          detail.map(({ block, secs }) => (
            <div key={block!.id} className="flex items-center gap-2.5 py-1.5">
              <BlockIcon name={block!.icon} className="w-5 h-5 text-ink shrink-0" />
              <span className="text-ink flex-1 truncate">{block!.name}</span>
              <span className="text-sub text-sm shrink-0">{formatDuration(secs)}</span>
            </div>
          ))
        )}
      </div>
    </>
  )
}

function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function addDaysISO(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + n)
  return localISO(d)
}
