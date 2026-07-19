import { useEffect, useReducer, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useTimeBlocks, useTimeSessions, useBlockGroups, useStartTimer, useStopTimer, useDeleteBlock, useUpdateBlock } from '@/hooks/useTimeBlocks'
import { elapsedSeconds, formatDuration, totalsByBlock, sumInRange, weekStartISO } from '@/lib/time'
import { todayISO } from '@/lib/date'
import { ARCHIVE_COLORS } from '@/lib/archive'
import TimeBlockSheet from '@/components/TimeBlockSheet'
import TimeGroupSheet from '@/components/TimeGroupSheet'
import BlockIcon from '@/components/BlockIcon'
import NavButton from '@/components/NavButton'
import type { ArchiveColor, TimeBlock } from '@/types'

const NONE = '__none__'   // '일반 블럭'(group_id null) 섹션 키

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

  // 드래그로 그룹 이동. 편집 모드에서만 동작한다.
  // 편집 모드에선 탭이 타이머와 겹치지 않아 길게 누르기 없이 이동 임계값으로 시작한다.
  const pressRef = useRef<{ id: string; sx: number; sy: number; dragging: boolean } | null>(null)
  const dragRef = useRef<{ id: string; from: string; over: string } | null>(null)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const [, force] = useReducer((x: number) => x + 1, 0)

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
      // 편집 중에는 비어 있어도 렌더한다 — 드롭 대상이 없으면 일반으로 되돌릴 수 없다
      return rest.length || editMode ? [{ id: NONE, label: '일반 블럭', items: rest }] : []
    })(),
  ]

  function onTapBlock(b: TimeBlock) {
    if (running?.block_id === b.id) stop.mutate(running.id)
    else start.mutate({ blockId: b.id, runningId: running?.id ?? null })
  }

  const MOVE_THRESHOLD = 6
  const groupIdOf = (sectionId: string) => (sectionId === NONE ? null : sectionId)

  // 포인터가 올라가 있는 섹션을 찾는다(격자 어디에 떨어뜨려도 그 그룹으로 간다)
  // 드롭 하이라이트는 ring/bg만 쓴다 — 드래그 중 패딩을 바꾸면 섹션 크기가
  // 변해 히트 영역이 흔들린다(폴더 드래그에서 겪었던 지터와 같은 부류).
  function sectionAt(x: number, y: number): string | null {
    for (const [id, el] of Object.entries(sectionRefs.current)) {
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return id
    }
    return null
  }

  function onCardDown(e: ReactPointerEvent, b: TimeBlock) {
    if (!editMode) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    pressRef.current = { id: b.id, sx: e.clientX, sy: e.clientY, dragging: false }
    dragRef.current = null
  }

  function onCardMove(e: ReactPointerEvent, sectionId: string) {
    const p = pressRef.current
    if (!p) return
    if (!p.dragging) {
      if (Math.abs(e.clientX - p.sx) <= MOVE_THRESHOLD && Math.abs(e.clientY - p.sy) <= MOVE_THRESHOLD) return
      p.dragging = true
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ }
      dragRef.current = { id: p.id, from: sectionId, over: sectionId }
    }
    e.preventDefault()
    const d = dragRef.current
    if (!d) return
    const over = sectionAt(e.clientX, e.clientY) ?? d.over
    if (over !== d.over) { dragRef.current = { ...d, over }; force() }
  }

  async function onCardUp(b: TimeBlock) {
    const p = pressRef.current
    const d = dragRef.current
    pressRef.current = null
    dragRef.current = null
    if (!p) return
    if (!p.dragging) { setEditing(b); return }   // 움직이지 않았으면 수정
    force()
    if (!d || d.over === d.from) return
    try { await upd.mutateAsync({ id: b.id, group_id: groupIdOf(d.over) }) }
    catch { /* 전역 토스트 */ }
  }

  function onCardCancel() {
    pressRef.current = null
    if (dragRef.current) { dragRef.current = null; force() }
  }

  async function removeBlock(b: TimeBlock) {
    if (!confirm(`'${b.name}' 블럭을 삭제할까요?\n이 블럭에 쌓인 기록도 함께 지워집니다.`)) return
    try { await del.mutateAsync(b.id) } catch { /* 전역 토스트 */ }
  }

  function renderCard(b: TimeBlock, sectionId: string) {
    const isRunning = running?.block_id === b.id
    const isDragging = dragRef.current?.id === b.id
    return (
      <div key={b.id} className="relative">
        {/* 평소엔 탭 = 타이머 시작/정지. 편집 모드에선 끌면 그룹 이동,
            안 움직이고 떼면 수정. 삭제는 모서리 배지로 뺐다. */}
        <button
          onClick={() => { if (!editMode) onTapBlock(b) }}
          onPointerDown={(e) => onCardDown(e, b)}
          onPointerMove={(e) => onCardMove(e, sectionId)}
          onPointerUp={() => { if (editMode) void onCardUp(b) }}
          onPointerCancel={onCardCancel}
          style={editMode ? { touchAction: 'none', WebkitTouchCallout: 'none' } : undefined}
          className={`w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 overflow-hidden active:opacity-70
            ${isRunning && !editMode ? 'bg-brand/15 ring-2 ring-brand' : 'bg-surface'}
            ${editMode ? 'ring-1 ring-dashed ring-sub/40' : ''}
            ${isDragging ? 'opacity-40 scale-95' : ''}`}>
          {b.color && (
            <span className="absolute top-0 right-3.5 w-2.5 h-4 rounded-b-full" style={{ backgroundColor: COLOR_HEX[b.color] }} />
          )}
          <BlockIcon name={b.icon} className={`w-7 h-7 ${isRunning && !editMode ? 'text-brand' : 'text-ink'}`} />
          <span className="text-ink text-[11px] font-medium truncate max-w-[85%] px-1">{b.name}</span>
          {editMode ? (
            <span className="text-sub text-[10px]">끌어서 이동</span>
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
        <h1 className="text-xl font-bold text-ink">Time</h1>
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
            <button onClick={() => { setEditMode((v) => !v); pressRef.current = null; dragRef.current = null }}
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
            <div key={s.id}
              ref={(el) => { sectionRefs.current[s.id] = el }}
              className={`rounded-xl transition-colors ${
                dragRef.current && dragRef.current.over === s.id && dragRef.current.from !== s.id
                  ? 'bg-brand/10 ring-1 ring-brand ring-dashed' : ''}`}>
              <h2 className="text-sub text-sm font-bold mb-2">{s.label}</h2>
              {s.items.length === 0 ? (
                <p className="text-sub/60 text-xs pb-1">
                  {editMode ? '여기로 끌어다 놓으세요' : '아직 블럭이 없어요'}
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2.5">{s.items.map((b) => renderCard(b, s.id))}</div>
              )}
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
