import { useEffect, useState } from 'react'
import { useTimeBlocks, useTimeSessions, useBlockGroups, useStartTimer, useStopTimer, useDeleteBlock, useUpdateBlock } from '@/hooks/useTimeBlocks'
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
  const upd = useUpdateBlock()

  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<TimeBlock | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [managingGroups, setManagingGroups] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())

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
  // 빈 그룹도 보여준다 — 방금 만든 그룹이 화면에서 사라지면 만들어졌는지 알 수 없다.
  const sections = [
    ...groups
      .map((g) => ({ id: g.id, label: g.name, items: blocks.filter((b) => b.group_id === g.id) })),
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

  function togglePick(id: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function movePicked(groupId: string | null) {
    const ids = [...picked]
    try {
      // 한 건이라도 실패하면 전역 토스트가 알린다. 성공분은 그대로 둔다.
      await Promise.all(ids.map((id) => upd.mutateAsync({ id, group_id: groupId })))
      setPicked(new Set())
    } catch { /* 전역 토스트 */ }
  }

  async function removeBlock(b: TimeBlock) {
    if (!confirm(`'${b.name}' 블럭을 삭제할까요?\n이 블럭에 쌓인 기록도 함께 지워집니다.`)) return
    try { await del.mutateAsync(b.id) } catch { /* 전역 토스트 */ }
  }

  function renderCard(b: TimeBlock) {
    const isRunning = running?.block_id === b.id
    return (
      <div key={b.id} className="relative">
        {/* 편집 모드에선 탭이 타이머가 아니라 '선택'이다(여러 개 골라 그룹 이동).
            개별 수정·삭제는 모서리 배지로 뺐다. */}
        <button onClick={() => (editMode ? togglePick(b.id) : onTapBlock(b))}
          className={`w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 overflow-hidden active:opacity-70
            ${isRunning && !editMode ? 'bg-brand/15 ring-2 ring-brand' : 'bg-surface'}
            ${editMode ? (picked.has(b.id) ? 'ring-2 ring-brand bg-brand/10' : 'ring-1 ring-dashed ring-sub/40') : ''}`}>
          {b.color && (
            <span className="absolute top-0 right-3.5 w-2.5 h-4 rounded-b-full" style={{ backgroundColor: COLOR_HEX[b.color] }} />
          )}
          <BlockIcon name={b.icon} className={`w-7 h-7 ${isRunning && !editMode ? 'text-brand' : 'text-ink'}`} />
          <span className="text-ink text-[11px] font-medium truncate max-w-[85%] px-1">{b.name}</span>
          {editMode ? (
            <span className={`text-[10px] ${picked.has(b.id) ? 'text-brand font-bold' : 'text-sub'}`}>
              {picked.has(b.id) ? '선택됨' : '선택'}
            </span>
          ) : (totals[b.id] ?? 0) > 0 ? (
            <span className="text-sub text-[10px]">{formatDuration(totals[b.id])}</span>
          ) : null}
        </button>
        {editMode && (
          <>
            <button onClick={() => removeBlock(b)} aria-label={`${b.name} 삭제`}
              className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-danger text-white text-sm font-bold flex items-center justify-center shadow active:opacity-70">
              ×
            </button>
            <button onClick={() => setEditing(b)} aria-label={`${b.name} 수정`}
              className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-ink text-bg text-[11px] font-bold flex items-center justify-center shadow active:opacity-70">
              ✎
            </button>
          </>
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
            <button onClick={() => { setEditMode((v) => !v); setPicked(new Set()) }}
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
              {s.items.length === 0 ? (
                <p className="text-sub/60 text-xs pb-1">아직 블럭이 없어요</p>
              ) : (
                <div className="grid grid-cols-3 gap-2.5">{s.items.map(renderCard)}</div>
              )}
            </div>
          ))
        )}

        {editMode && (
          <div className="space-y-2">
            {picked.size > 0 && (
              <div className="bg-surface rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-ink text-sm font-bold">{picked.size}개 선택됨 · 옮길 그룹</span>
                  <button onClick={() => setPicked(new Set())} className="text-sub text-xs">선택 해제</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {groups.map((g) => (
                    <button key={g.id} onClick={() => movePicked(g.id)}
                      className="bg-card text-ink rounded-xl px-3 py-1.5 text-sm active:opacity-70">
                      {g.name}
                    </button>
                  ))}
                  <button onClick={() => movePicked(null)}
                    className="bg-card text-sub rounded-xl px-3 py-1.5 text-sm active:opacity-70">
                    일반 블럭
                  </button>
                </div>
              </div>
            )}
            <button onClick={() => setManagingGroups(true)}
              className="w-full bg-surface text-sub rounded-xl py-2.5 text-sm font-medium active:opacity-70">
              그룹 관리
            </button>
          </div>
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
