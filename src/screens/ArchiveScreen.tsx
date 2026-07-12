import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFolders, useArchiveItems, useToggleCheck } from '@/hooks/useArchive'
import { checklistProgress, countByFolder } from '@/lib/archive'
import ArchiveItemSheet from '@/components/ArchiveItemSheet'
import FolderSheet from '@/components/FolderSheet'
import type { ArchiveItem } from '@/types'

export default function ArchiveScreen() {
  const nav = useNavigate()
  const { data: folders = [] } = useFolders()
  const { data: items = [] } = useArchiveItems()
  const toggle = useToggleCheck()

  const [sel, setSel] = useState<string>('all') // 'all' | 'none' | folderId
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<ArchiveItem | null>(null)
  const [manageFolders, setManageFolders] = useState(false)

  const counts = countByFolder(items)
  const shown = sel === 'all' ? items
    : sel === 'none' ? items.filter((i) => !i.folder_id)
    : items.filter((i) => i.folder_id === sel)

  const chip = (key: string, label: string, n: number) => (
    <button key={key} onClick={() => setSel(key)}
      className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${sel === key ? 'bg-brand text-white' : 'bg-card text-sub'}`}>
      {label}{n > 0 ? ` ${n}` : ''}
    </button>
  )

  return (
    <div className="p-5 space-y-5">
      <button onClick={() => nav('/')} className="text-sub text-sm">‹ 홈</button>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">아카이빙</h1>
        <button onClick={() => setManageFolders(true)} className="text-sub text-sm">폴더 관리</button>
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-5 px-5">
        {chip('all', '전체', items.length)}
        {chip('none', '미분류', counts['none'] ?? 0)}
        {folders.map((f) => chip(f.id, f.name, counts[f.id] ?? 0))}
      </div>

      <div className="space-y-3">
        {shown.length === 0 && <p className="text-sub text-sm text-center py-8">항목이 없어요</p>}
        {shown.map((it) => {
          if (it.kind === 'link') {
            return (
              <div key={it.id} className="bg-card rounded-2xl overflow-hidden">
                <a href={it.url ?? '#'} target="_blank" rel="noreferrer" className="block active:opacity-70">
                  {it.preview?.image && <img src={it.preview.image} alt="" className="w-full max-h-40 object-cover" />}
                  <div className="p-4">
                    <p className="text-ink font-medium truncate">{it.title || it.url}</p>
                    {it.preview?.site && <p className="text-sub text-xs mt-1">{it.preview.site}</p>}
                  </div>
                </a>
                <button onClick={() => setEditing(it)} className="w-full text-right text-sub text-xs px-4 pb-3">편집</button>
              </div>
            )
          }
          if (it.kind === 'checklist') {
            const { done, total } = checklistProgress(it.checklist)
            return (
              <div key={it.id} className="bg-card rounded-2xl p-4">
                <button onClick={() => setEditing(it)} className="w-full text-left active:opacity-70">
                  <div className="flex justify-between items-center">
                    <span className="text-ink font-medium">{it.title || '체크리스트'}</span>
                    <span className="text-sub text-xs">{done}/{total}</span>
                  </div>
                </button>
                <div className="mt-3 space-y-2">
                  {(it.checklist ?? []).map((c, i) => (
                    <button key={i} onClick={() => toggle.mutate({ item: it, index: i })}
                      className="flex items-center gap-2 w-full text-left active:opacity-70">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 ${c.done ? 'bg-brand text-white' : 'bg-white text-transparent border border-sub/30'}`}>✓</span>
                      <span className={`text-sm ${c.done ? 'text-sub line-through' : 'text-ink'}`}>{c.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          }
          return (
            <button key={it.id} onClick={() => setEditing(it)} className="w-full text-left bg-card rounded-2xl p-4 active:opacity-70">
              <p className="text-ink font-medium">{it.title || '메모'}</p>
              {it.body && <p className="text-sub text-sm mt-1 whitespace-pre-wrap line-clamp-3">{it.body}</p>}
            </button>
          )
        })}
      </div>

      <button onClick={() => setAdding(true)} className="w-full bg-brand text-white rounded-2xl py-3 font-bold">항목 추가</button>

      {adding && <ArchiveItemSheet open onClose={() => setAdding(false)} defaultFolderId={sel !== 'all' && sel !== 'none' ? sel : null} />}
      {editing && <ArchiveItemSheet open onClose={() => setEditing(null)} editing={editing} />}
      {manageFolders && <FolderSheet open onClose={() => setManageFolders(false)} />}
    </div>
  )
}
