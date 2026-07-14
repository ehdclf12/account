import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useArchiveItems } from '@/hooks/useArchive'
import { calendarItems, groupByDue, isAllDone, monthGrid, shiftMonth } from '@/lib/calendar'
import { formatDayHeader, todayISO } from '@/lib/date'
import { ARCHIVE_COLORS } from '@/lib/archive'
import ChecklistCard from '@/components/ChecklistCard'
import ArchiveItemSheet from '@/components/ArchiveItemSheet'
import type { ArchiveColor, ArchiveItem } from '@/types'

const COLOR_HEX: Record<ArchiveColor, string> = Object.fromEntries(
  ARCHIVE_COLORS.map((c) => [c.key, c.hex]),
) as Record<ArchiveColor, string>
const NO_COLOR = '#C4CBD3'
const bar = (c: ArchiveColor | null) => (c ? COLOR_HEX[c] : NO_COLOR)

const WEEK = ['월', '화', '수', '목', '금', '토', '일']

export default function CalendarScreen() {
  const nav = useNavigate()
  const { data: items = [] } = useArchiveItems()
  const today = todayISO()

  const [cursor, setCursor] = useState(() => {
    const n = new Date()
    return { year: n.getFullYear(), month: n.getMonth() + 1 }
  })
  const [selected, setSelected] = useState(today)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<ArchiveItem | null>(null)

  const byDue = groupByDue(calendarItems(items))
  const cells = monthGrid(cursor.year, cursor.month)
  const dayItems = byDue[selected] ?? []

  // 좌우 스와이프로 월 이동. 가로 이동량이 세로보다 클 때만 처리해 세로 스크롤과 안 부딪히게 한다.
  const start = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)
  function onDown(e: React.PointerEvent) { start.current = { x: e.clientX, y: e.clientY } }
  function onUp(e: React.PointerEvent) {
    const s = start.current
    start.current = null
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy)) return
    swiped.current = true
    setCursor((c) => shiftMonth(c.year, c.month, dx < 0 ? 1 : -1))
  }

  function goToday() {
    const n = new Date()
    setCursor({ year: n.getFullYear(), month: n.getMonth() + 1 })
    setSelected(today)
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-ink">{cursor.month}</span>
          <span className="text-sub text-sm">{cursor.year}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={goToday} className="rounded-full border border-sub/30 text-sub text-xs font-medium px-3 py-1 active:opacity-70">
            TODAY
          </button>
          <button onClick={() => nav('/')} className="text-sub text-sm">홈</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 touch-pan-y" onPointerDown={onDown} onPointerUp={onUp}>
        {WEEK.map((w) => (
          <div key={w} className="text-center text-xs text-sub pb-1">{w}</div>
        ))}
        {cells.map((c) => {
          const list = byDue[c.iso] ?? []
          const isToday = c.iso === today
          const isSel = c.iso === selected
          return (
            <button key={c.iso} onClick={() => {
                if (swiped.current) { swiped.current = false; return }
                setSelected(c.iso)
              }}
              className={`min-h-[76px] rounded-lg p-1 text-left align-top active:opacity-70
                ${isSel ? 'bg-brand/10 ring-1 ring-brand' : isToday ? 'bg-card' : ''}`}>
              <div className={`text-xs text-center font-medium ${c.inMonth ? 'text-ink' : 'text-sub/50'}`}>{c.day}</div>
              <div className="mt-1 space-y-0.5">
                {list.slice(0, 3).map((it) => (
                  <div key={it.id} className="flex items-center gap-1">
                    <span className="w-[3px] h-3 rounded-sm shrink-0" style={{ backgroundColor: bar(it.color) }} />
                    <span className={`text-[10px] truncate ${
                      isAllDone(it) ? 'text-sub line-through'
                        : c.iso < today ? 'text-[#F04452]'
                        : 'text-ink'}`}>
                      {it.title || '체크리스트'}
                    </span>
                  </div>
                ))}
                {list.length > 3 && <div className="text-[10px] text-sub pl-1">+{list.length - 3}</div>}
              </div>
            </button>
          )
        })}
      </div>

      <div className="border-t border-card pt-4 space-y-2">
        <h2 className="font-bold text-ink">
          {selected.slice(0, 4)}년 {formatDayHeader(selected)}
        </h2>

        {dayItems.length === 0 && <p className="text-sub text-sm py-4">할 일이 없어요</p>}

        {dayItems.map((it) => (
          <div key={it.id} className="space-y-2">
            <button onClick={() => setExpanded((e) => ({ ...e, [it.id]: !e[it.id] }))}
              className="w-full flex items-center gap-2 py-1.5 text-left active:opacity-70">
              <span className="w-1 h-4 rounded-sm shrink-0" style={{ backgroundColor: bar(it.color) }} />
              <span className={`flex-1 truncate ${isAllDone(it) ? 'text-sub line-through' : 'text-ink'}`}>
                {it.title || '체크리스트'}
              </span>
              <span className="text-sub text-xs shrink-0">{expanded[it.id] ? '접기' : '펼치기'}</span>
            </button>
            {expanded[it.id] && <ChecklistCard item={it} onEdit={() => setEditing(it)} />}
          </div>
        ))}

        <button onClick={() => setAdding(true)}
          className="w-full bg-card text-sub rounded-2xl py-3 font-medium active:opacity-70">
          + 새로운 이벤트
        </button>
      </div>

      {adding && <ArchiveItemSheet open onClose={() => setAdding(false)} defaultDueDate={selected} />}
      {editing && <ArchiveItemSheet open onClose={() => setEditing(null)} editing={editing} />}
    </div>
  )
}
