import { useReducer, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useFolders, useReorderFolders } from '@/hooks/useArchive'
import { buildFolderTree, moveItem } from '@/lib/archive'
import type { ArchiveFolder } from '@/types'

type DragState = { group: string; ids: string[]; orig: string[]; activeId: string } | null
const LONG_PRESS_MS = 300
const MOVE_THRESHOLD = 6

export default function FolderDrawer(
  { open, onClose, selected, onSelect, onManage, cols, onCols }:
  { open: boolean; onClose: () => void; selected: string; onSelect: (key: string) => void; onManage: () => void; cols: number; onCols: (n: number) => void },
) {
  const { data: folders = [] } = useFolders()
  const reorder = useReorderFolders()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const dragRef = useRef<DragState>(null)
  const pressRef = useRef<{ id: string; timer: number; dragging: boolean; sx: number; sy: number } | null>(null)
  const rowRefs = useRef<Record<string, HTMLElement | null>>({})
  const [, force] = useReducer((x: number) => x + 1, 0)

  if (!open) return null
  const tree = buildFolderTree(folders)

  function pick(key: string) { onSelect(key); onClose() }
  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  function orderedIds(groupKey: string, naturalIds: string[]): string[] {
    const d = dragRef.current
    return d && d.group === groupKey ? d.ids : naturalIds
  }

  function onPointerDown(e: ReactPointerEvent, id: string, group: string, siblingIds: string[]) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const el = e.currentTarget as HTMLElement
    const pid = e.pointerId
    const sx = e.clientX, sy = e.clientY
    const timer = window.setTimeout(() => {
      if (!pressRef.current) return
      pressRef.current.dragging = true
      try { el.setPointerCapture(pid) } catch { /* noop */ }
      dragRef.current = { group, ids: siblingIds, orig: siblingIds, activeId: id }
      force()
    }, LONG_PRESS_MS)
    pressRef.current = { id, timer, dragging: false, sx, sy }
  }

  function onPointerMove(e: ReactPointerEvent) {
    const p = pressRef.current
    if (!p) return
    if (!p.dragging) {
      if (Math.abs(e.clientY - p.sy) > MOVE_THRESHOLD || Math.abs(e.clientX - p.sx) > MOVE_THRESHOLD) {
        clearTimeout(p.timer); pressRef.current = null
      }
      return
    }
    e.preventDefault()
    const d = dragRef.current
    if (!d) return
    const cur = d.ids.indexOf(d.activeId)
    let target = cur
    for (let i = 0; i < d.ids.length; i++) {
      const rowEl = rowRefs.current[d.ids[i]]
      if (!rowEl) continue
      const r = rowEl.getBoundingClientRect()
      const mid = r.top + r.height / 2
      if (e.clientY < mid) { target = i; break }
      target = i
    }
    if (target !== cur) { dragRef.current = { ...d, ids: moveItem(d.ids, cur, target) }; force() }
  }

  function onPointerUp() {
    const p = pressRef.current
    if (!p) return
    clearTimeout(p.timer)
    if (p.dragging) {
      const d = dragRef.current
      if (d && d.ids.join(',') !== d.orig.join(',')) reorder.mutate(d.ids.map((id, i) => ({ id, sort_order: i })))
      dragRef.current = null
      force()
    } else {
      pick(p.id)
    }
    pressRef.current = null
  }

  function onPointerCancel() {
    const p = pressRef.current
    if (p) clearTimeout(p.timer)
    pressRef.current = null
    if (dragRef.current) { dragRef.current = null; force() }
  }

  const rowCls = (key: string) =>
    `flex-1 text-left rounded-xl px-3 py-2 text-sm font-medium ${selected === key ? 'bg-brand text-white' : 'text-ink active:bg-card'}`

  function folderButton(f: ArchiveFolder, group: string, siblingIds: string[]) {
    const dragging = dragRef.current?.activeId === f.id
    return (
      <button
        ref={(el) => { rowRefs.current[f.id] = el }}
        onPointerDown={(e) => onPointerDown(e, f.id, group, siblingIds)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{ touchAction: 'none', WebkitTouchCallout: 'none' }}
        className={`${rowCls(f.id)} ${dragging ? 'opacity-70 scale-[1.02] ring-2 ring-brand/40' : ''}`}>
        {f.name}
      </button>
    )
  }

  const topIds = tree.map((t) => t.id)
  const topById = new Map(tree.map((t) => [t.id, t]))
  const topOrder = orderedIds('top', topIds)

  return (
    <div className="fixed inset-0 z-50 bg-dim" onClick={onClose}>
      <div className="absolute left-0 top-0 h-full w-4/5 max-w-xs bg-surface flex flex-col select-none" style={{ WebkitTouchCallout: 'none' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold text-ink">폴더</span>
          <button onClick={onManage} className="text-sub text-sm">관리</button>
        </div>

        <button onClick={() => pick('all')} className={rowCls('all')}>전체</button>

        {topOrder.map((tid) => {
          const top = topById.get(tid)
          if (!top) return null
          const childIds = top.children.map((c) => c.id)
          const childById = new Map(top.children.map((c) => [c.id, c]))
          const childOrder = orderedIds(top.id, childIds)
          const isExpanded = expanded.has(top.id)
          return (
            <div key={top.id}>
              <div className="flex items-center gap-1">
                {top.children.length > 0 ? (
                  <button onClick={() => toggleExpand(top.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-card text-brand text-lg font-bold shrink-0 active:opacity-60">{isExpanded ? '▾' : '▸'}</button>
                ) : <span className="w-8 shrink-0" />}
                {folderButton(top, 'top', topIds)}
              </div>
              {isExpanded && childOrder.map((cid) => {
                const c = childById.get(cid)
                if (!c) return null
                return (
                  <div key={c.id} className="flex items-center gap-1 pl-6">
                    {folderButton(c, top.id, childIds)}
                  </div>
                )
              })}
            </div>
          )
        })}

        {folders.length === 0 && <p className="text-sub text-sm py-4">폴더가 없어요. '관리'에서 만들어 주세요.</p>}
        </div>

        <div className="border-t border-line p-4 space-y-2">
          <span className="text-sub text-xs font-bold">보기</span>
          <div className="grid grid-cols-3 gap-2">
            {[{ n: 1, label: '세로형' }, { n: 2, label: '2열' }, { n: 3, label: '3열' }].map((o) => (
              <button key={o.n} onClick={() => onCols(o.n)}
                className={`rounded-xl py-2 text-sm font-medium ${cols === o.n ? 'bg-brand text-white' : 'bg-card text-sub'}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
