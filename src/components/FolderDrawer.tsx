import { useState } from 'react'
import { useFolders } from '@/hooks/useArchive'
import { buildFolderTree } from '@/lib/archive'

export default function FolderDrawer(
  { open, onClose, selected, onSelect, onManage }:
  { open: boolean; onClose: () => void; selected: string; onSelect: (key: string) => void; onManage: () => void },
) {
  const { data: folders = [] } = useFolders()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  if (!open) return null
  const tree = buildFolderTree(folders)

  function pick(key: string) { onSelect(key); onClose() }
  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const rowCls = (key: string) =>
    `flex-1 text-left rounded-xl px-3 py-2 text-sm font-medium ${selected === key ? 'bg-brand text-white' : 'text-ink active:bg-card'}`

  return (
    <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose}>
      <div className="absolute left-0 top-0 h-full w-4/5 max-w-xs bg-white p-4 space-y-1 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold text-ink">폴더</span>
          <button onClick={onManage} className="text-sub text-sm">관리</button>
        </div>

        <button onClick={() => pick('all')} className={rowCls('all')}>전체</button>

        {tree.map((top) => (
          <div key={top.id}>
            <div className="flex items-center gap-1">
              {top.children.length > 0 ? (
                <button onClick={() => toggle(top.id)} className="w-6 text-sub text-xs shrink-0">{expanded.has(top.id) ? '▾' : '▸'}</button>
              ) : <span className="w-6 shrink-0" />}
              <button onClick={() => pick(top.id)} className={rowCls(top.id)}>{top.name}</button>
            </div>
            {expanded.has(top.id) && top.children.map((c) => (
              <div key={c.id} className="flex items-center gap-1 pl-6">
                <button onClick={() => pick(c.id)} className={rowCls(c.id)}>{c.name}</button>
              </div>
            ))}
          </div>
        ))}

        {folders.length === 0 && <p className="text-sub text-sm py-4">폴더가 없어요. '관리'에서 만들어 주세요.</p>}
      </div>
    </div>
  )
}
