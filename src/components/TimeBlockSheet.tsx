import { useState } from 'react'
import { useAddBlock, useUpdateBlock, useDeleteBlock } from '@/hooks/useTimeBlocks'
import { ARCHIVE_COLORS } from '@/lib/archive'
import { showToast } from '@/lib/toast'
import type { ArchiveColor, TimeBlock } from '@/types'

const NAME_MAX = 16
const EMOJIS = ['⏱️', '📚', '💻', '🏃', '🧘', '🍳', '📺', '🎧', '✍️', '🎨', '🧹', '💤']

export default function TimeBlockSheet(
  { open, onClose, editing, nextOrder }:
  { open: boolean; onClose: () => void; editing?: TimeBlock; nextOrder: number },
) {
  const add = useAddBlock(); const upd = useUpdateBlock(); const del = useDeleteBlock()

  const [name, setName] = useState(editing?.name ?? '')
  const [emoji, setEmoji] = useState(editing?.emoji ?? EMOJIS[0])
  const [color, setColor] = useState<ArchiveColor | null>(editing?.color ?? null)

  if (!open) return null

  async function save() {
    const n = name.trim()
    if (!n) { showToast('작업명을 입력해 주세요.'); return }
    try {
      if (editing) await upd.mutateAsync({ id: editing.id, name: n, emoji, color })
      else await add.mutateAsync({ name: n, emoji, color, sort_order: nextOrder })
      onClose()
    } catch { /* 실패 시 시트를 열어둔다(사유는 전역 토스트로 안내) */ }
  }

  async function remove() {
    if (!editing) return
    if (!confirm(`'${editing.name}' 블럭을 삭제할까요?\n이 블럭에 쌓인 기록도 함께 지워집니다.`)) return
    try { await del.mutateAsync(editing.id); onClose() } catch { /* 전역 토스트 */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dim" onClick={onClose}>
      <div className="w-full max-w-md bg-surface rounded-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <button onClick={onClose} className="text-sub text-sm font-medium">닫기</button>
          <span className="font-bold text-ink">{editing ? '블럭 수정' : '블럭 생성'}</span>
          <button onClick={save} className="text-brand text-sm font-bold">확인</button>
        </div>

        {/* 미리보기 카드 — 격자에 놓일 모습 그대로 */}
        <div className="flex justify-center py-2">
          <div className="relative w-32 h-32 bg-card rounded-2xl flex flex-col items-center justify-center gap-2 overflow-hidden">
            {color && (
              <span className="absolute top-0 right-4 w-3 h-5 rounded-b-full"
                style={{ backgroundColor: ARCHIVE_COLORS.find((c) => c.key === color)?.hex }} />
            )}
            <span className="text-4xl leading-none">{emoji}</span>
            <span className="text-ink text-sm font-medium truncate max-w-[100px]">{name || '작업명'}</span>
          </div>
        </div>

        <div>
          <label className="text-sub text-xs font-bold">아이콘</label>
          <div className="grid grid-cols-6 gap-2 mt-2">
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => setEmoji(e)}
                className={`aspect-square rounded-xl text-xl flex items-center justify-center ${emoji === e ? 'bg-brand/15 ring-2 ring-brand' : 'bg-card'}`}>
                {e}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sub text-xs font-bold">작업명</label>
          <div className="flex items-center gap-2 bg-card rounded-xl px-3 mt-2">
            <input value={name} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)}
              placeholder="예: 뉴스 시청" className="flex-1 bg-transparent py-2.5 outline-none text-ink" />
            <span className="text-sub text-xs shrink-0">{name.length}/{NAME_MAX}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sub text-sm">색상</span>
          <div className="flex gap-2 items-center">
            <button onClick={() => setColor(null)} className={`w-6 h-6 rounded-full border ${color === null ? 'border-ink' : 'border-line'} text-sub text-xs`}>×</button>
            {ARCHIVE_COLORS.map((c) => (
              <button key={c.key} onClick={() => setColor(c.key)} style={{ backgroundColor: c.hex }}
                className={`w-6 h-6 rounded-full ${color === c.key ? 'ring-2 ring-ink' : ''}`} />
            ))}
          </div>
        </div>

        {editing && <button onClick={remove} className="w-full text-danger text-sm py-1">삭제</button>}
      </div>
    </div>
  )
}
