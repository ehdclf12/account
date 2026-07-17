import type { ReactNode } from 'react'
import { useToggleCheck, useToggleDone } from '@/hooks/useArchive'
import { checklistProgress, ARCHIVE_COLORS } from '@/lib/archive'
import type { ArchiveColor, ArchiveItem } from '@/types'

const COLOR_HEX: Record<ArchiveColor, string> = Object.fromEntries(
  ARCHIVE_COLORS.map((c) => [c.key, c.hex]),
) as Record<ArchiveColor, string>

export default function ChecklistCard(
  { item, onEdit, badges }: { item: ArchiveItem; onEdit: () => void; badges?: ReactNode },
) {
  const toggle = useToggleCheck()
  const toggleDone = useToggleDone()
  const { done, total } = checklistProgress(item.checklist)
  const strip = item.color ? { borderLeft: `4px solid ${COLOR_HEX[item.color]}` } : undefined

  return (
    <div className="bg-card rounded-2xl p-4" style={strip}>
      <div className="flex justify-between items-center gap-2">
        <button onClick={() => toggleDone.mutate({ id: item.id, done: !item.done })} className="flex items-center gap-2 min-w-0 text-left active:opacity-70">
          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 ${item.done ? 'bg-brand text-white' : 'bg-surface text-transparent border border-sub/30'}`}>✓</span>
          <span className={`font-medium truncate ${item.done ? 'text-sub line-through' : 'text-ink'}`}>{item.title || '체크리스트'}</span>
        </button>
        <span className="flex items-center gap-2 shrink-0">
          {badges}
          {total > 0 && <span className="text-sub text-xs">{done}/{total}</span>}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {(item.checklist ?? []).map((c, i) => (
          <button key={i} onClick={() => toggle.mutate({ item, index: i })} className="flex items-center gap-2 w-full text-left active:opacity-70">
            <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 ${c.done ? 'bg-brand text-white' : 'bg-surface text-transparent border border-sub/30'}`}>✓</span>
            <span className={`text-sm ${c.done ? 'text-sub line-through' : 'text-ink'}`}>{c.text}</span>
          </button>
        ))}
      </div>
      <button onClick={onEdit} className="mt-3 w-full text-right text-brand text-sm font-medium">수정</button>
    </div>
  )
}
