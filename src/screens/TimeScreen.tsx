import { useEffect, useState } from 'react'
import { useTimeBlocks, useTimeSessions, useStartTimer, useStopTimer } from '@/hooks/useTimeBlocks'
import { elapsedSeconds, formatDuration, totalsByBlock, sumInRange, weekStartISO } from '@/lib/time'
import { todayISO } from '@/lib/date'
import { ARCHIVE_COLORS } from '@/lib/archive'
import TimeBlockSheet from '@/components/TimeBlockSheet'
import NavButton from '@/components/NavButton'
import type { ArchiveColor, TimeBlock } from '@/types'

const COLOR_HEX: Record<ArchiveColor, string> = Object.fromEntries(
  ARCHIVE_COLORS.map((c) => [c.key, c.hex]),
) as Record<ArchiveColor, string>

function nextDayISO(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function addDaysISO(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function TimeScreen() {
  const { data: blocks = [] } = useTimeBlocks()
  const { data: sessions = [] } = useTimeSessions()
  const start = useStartTimer()
  const stop = useStopTimer()

  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<TimeBlock | null>(null)

  const running = sessions.find((s) => s.ended_at === null) ?? null

  // 진행 중일 때만 1초마다 다시 그린다. 멈춰 있으면 타이머를 걸지 않는다.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [running])

  const today = todayISO()
  const totals = totalsByBlock(sessions, now)
  const todayTotal = sumInRange(sessions, today, nextDayISO(today), now)
  const weekFrom = weekStartISO(today)
  const weekTotal = sumInRange(sessions, weekFrom, addDaysISO(weekFrom, 7), now)

  const runningBlock = running ? blocks.find((b) => b.id === running.block_id) ?? null : null

  function onTapBlock(b: TimeBlock) {
    if (running?.block_id === b.id) stop.mutate(running.id)
    else start.mutate({ blockId: b.id, runningId: running?.id ?? null })
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">시간관리</h1>
        <NavButton to="/" label="홈" />
      </div>

      <div className="flex gap-3">
        <div className="flex-1 bg-card rounded-2xl px-4 py-3">
          <p className="text-sub text-xs">오늘</p>
          <p className="text-ink font-bold text-lg mt-0.5">{formatDuration(todayTotal)}</p>
        </div>
        <div className="flex-1 bg-card rounded-2xl px-4 py-3">
          <p className="text-sub text-xs">이번 주</p>
          <p className="text-ink font-bold text-lg mt-0.5">{formatDuration(weekTotal)}</p>
        </div>
      </div>

      {running && runningBlock && (
        <div className="bg-brand text-white rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs opacity-80 truncate">{runningBlock.emoji} {runningBlock.name}</p>
            <p className="font-bold text-2xl tabular-nums mt-0.5">
              {hhmmss(elapsedSeconds(running, now))}
            </p>
          </div>
          <button onClick={() => stop.mutate(running.id)}
            className="bg-white/20 rounded-xl px-4 py-2 font-bold shrink-0 active:opacity-70">
            정지
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {blocks.map((b) => {
          const isRunning = running?.block_id === b.id
          return (
            <button key={b.id} onClick={() => onTapBlock(b)}
              onContextMenu={(e) => { e.preventDefault(); setEditing(b) }}
              className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center gap-1.5 overflow-hidden active:opacity-70
                ${isRunning ? 'bg-brand/15 ring-2 ring-brand' : 'bg-card'}`}>
              {b.color && (
                <span className="absolute top-0 right-4 w-3 h-5 rounded-b-full" style={{ backgroundColor: COLOR_HEX[b.color] }} />
              )}
              <span className="text-4xl leading-none">{b.emoji}</span>
              <span className="text-ink text-sm font-medium truncate max-w-[80%]">{b.name}</span>
              <span className="text-sub text-xs">{formatDuration(totals[b.id] ?? 0)}</span>
              <span onClick={(e) => { e.stopPropagation(); setEditing(b) }}
                className="absolute bottom-1.5 right-2 text-sub text-xs px-1.5 py-0.5">수정</span>
            </button>
          )
        })}

        <button onClick={() => setAdding(true)}
          className="aspect-square rounded-2xl border-2 border-dashed border-sub/30 flex flex-col items-center justify-center gap-2 active:opacity-70">
          <span className="w-10 h-10 rounded-full bg-sub/15 text-sub text-2xl flex items-center justify-center leading-none">+</span>
        </button>
      </div>

      {blocks.length === 0 && (
        <p className="text-sub text-sm text-center py-2">
          어제보다 한 블럭 더,<br />그게 성장이에요
        </p>
      )}

      {adding && <TimeBlockSheet open onClose={() => setAdding(false)} nextOrder={blocks.length} />}
      {editing && <TimeBlockSheet open onClose={() => setEditing(null)} editing={editing} nextOrder={blocks.length} />}
    </div>
  )
}

function hhmmss(total: number): string {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
