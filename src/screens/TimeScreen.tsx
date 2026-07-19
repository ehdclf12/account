import { useEffect, useState } from 'react'
import { useTimeBlocks, useTimeSessions, useBlockGroups, useStartTimer, useStopTimer, useDeleteBlock } from '@/hooks/useTimeBlocks'
import { elapsedSeconds, formatDuration, totalsByBlock, sumInRange, weekStartISO } from '@/lib/time'
import { todayISO } from '@/lib/date'
import { ARCHIVE_COLORS } from '@/lib/archive'
import TimeBlockSheet from '@/components/TimeBlockSheet'
import TimeGroupSheet from '@/components/TimeGroupSheet'
import BlockIcon from '@/components/BlockIcon'
import NavButton from '@/components/NavButton'
import type { ArchiveColor, TimeBlock } from '@/types'

const COLOR_HEX: Record<ArchiveColor, string> = Object.fromEntries(
  ARCHIVE_COLORS.map((c) => [c.key, c.hex]),
) as Record<ArchiveColor, string>

function addDaysISO(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function TimeScreen() {
  const { data: blocks = [] } = useTimeBlocks()
  const { data: sessions = [] } = useTimeSessions()
  const { data: groups = [] } = useBlockGroups()
  const start = useStartTimer()
  const stop = useStopTimer()
  const del = useDeleteBlock()

  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<TimeBlock | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [managingGroups, setManagingGroups] = useState(false)

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
  const todayTotal = sumInRange(sessions, today, addDaysISO(today, 1), now)
  const weekFrom = weekStartISO(today)
  const weekTotal = sumInRange(sessions, weekFrom, addDaysISO(weekFrom, 7), now)

  const runningBlock = running ? blocks.find((b) => b.id === running.block_id) ?? null : null

  // 그룹 순서대로 묶고, 그룹 없는 블럭은 '일반 블럭'으로 마지막에.
  // 빈 그룹은 숨긴다(아카이빙 전체 뷰와 같은 방식).
  const sections = [
    ...groups
      .map((g) => ({ id: g.id, label: g.name, items: blocks.filter((b) => b.group_id === g.id) }))
      .filter((s) => s.items.length > 0),
    ...(() => {
      const known = new Set(groups.map((g) => g.id))
      const rest = blocks.filter((b) => !b.group_id || !known.has(b.group_id))
      return rest.length ? [{ id: '__none__', label: '일반 블럭', items: rest }] : []
    })(),
  ]

  function onTapBlock(b: TimeBlock) {
    if (running?.block_id === b.id) stop.mutate(running.id)
    else start.mutate({ blockId: b.id, runningId: running?.id ?? null })
  }

  async function removeBlock(b: TimeBlock) {
    if (!confirm(`'${b.name}' 블럭을 삭제할까요?\n이 블럭에 쌓인 기록도 함께 지워집니다.`)) return
    try { await del.mutateAsync(b.id) } catch { /* 전역 토스트 */ }
  }

  function renderCard(b: TimeBlock) {
    const isRunning = running?.block_id === b.id
    return (
      <div key={b.id} className="relative">
        {/* 편집 모드에선 탭이 타이머가 아니라 수정으로 간다 */}
        <button onClick={() => (editMode ? setEditing(b) : onTapBlock(b))}
          className={`w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 overflow-hidden active:opacity-70
            ${isRunning && !editMode ? 'bg-brand/15 ring-2 ring-brand' : 'bg-surface'}
            ${editMode ? 'ring-1 ring-dashed ring-sub/40' : ''}`}>
          {b.color && (
            <span className="absolute top-0 right-3.5 w-2.5 h-4 rounded-b-full" style={{ backgroundColor: COLOR_HEX[b.color] }} />
          )}
          <BlockIcon name={b.icon} className={`w-7 h-7 ${isRunning && !editMode ? 'text-brand' : 'text-ink'}`} />
          <span className="text-ink text-[11px] font-medium truncate max-w-[85%] px-1">{b.name}</span>
          {editMode ? (
            <span className="text-sub text-[10px]">수정</span>
          ) : (totals[b.id] ?? 0) > 0 ? (
            <span className="text-sub text-[10px]">{formatDuration(totals[b.id])}</span>
          ) : null}
        </button>
        {editMode && (
          <button onClick={() => removeBlock(b)} aria-label={`${b.name} 삭제`}
            className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-danger text-white text-sm font-bold flex items-center justify-center shadow active:opacity-70">
            ×
          </button>
        )}
      </div>
    )
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
          <div className="min-w-0 flex items-center gap-2.5">
            <BlockIcon name={runningBlock.icon} className="w-6 h-6 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs opacity-80 truncate">{runningBlock.name}</p>
              <p className="font-bold text-2xl tabular-nums leading-tight">{hhmmss(elapsedSeconds(running, now))}</p>
            </div>
          </div>
          <button onClick={() => stop.mutate(running.id)}
            className="bg-white/20 rounded-xl px-4 py-2 font-bold shrink-0 active:opacity-70">정지</button>
        </div>
      )}

      <div className="bg-card rounded-2xl p-4 space-y-5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-ink">블럭 선택</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setEditMode((v) => !v)}
              className={`rounded-xl px-3 py-1.5 text-sm font-medium ${editMode ? 'bg-ink text-bg' : 'bg-surface text-sub'}`}>
              {editMode ? '완료' : '편집'}
            </button>
            <button onClick={() => setAdding(true)} aria-label="블럭 추가"
              className="text-ink text-2xl leading-none w-8 h-8 flex items-center justify-center active:opacity-60">+</button>
          </div>
        </div>

        {sections.length === 0 ? (
          <p className="text-sub text-sm text-center py-6">
            어제보다 한 블럭 더,<br />그게 성장이에요
          </p>
        ) : (
          sections.map((s) => (
            <div key={s.id}>
              <h2 className="text-sub text-sm font-bold mb-2">{s.label}</h2>
              <div className="grid grid-cols-3 gap-2.5">{s.items.map(renderCard)}</div>
            </div>
          ))
        )}

        {editMode && (
          <button onClick={() => setManagingGroups(true)}
            className="w-full bg-surface text-sub rounded-xl py-2.5 text-sm font-medium active:opacity-70">
            그룹 관리
          </button>
        )}
      </div>

      {adding && <TimeBlockSheet open onClose={() => setAdding(false)} nextOrder={blocks.length} />}
      {editing && <TimeBlockSheet open onClose={() => setEditing(null)} editing={editing} nextOrder={blocks.length} />}
      {managingGroups && <TimeGroupSheet open onClose={() => setManagingGroups(false)} />}
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
