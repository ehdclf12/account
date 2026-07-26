import { useState } from 'react'
import { useAddGoal, useUpdateGoal, useDeleteGoal } from '@/hooks/useTimeGoals'
import { showToast } from '@/lib/toast'
import type { TimeGoal } from '@/types'

const TITLE_MAX = 40

export default function TimeGoalSheet(
  { open, onClose, editing, nextOrder }:
  { open: boolean; onClose: () => void; editing?: TimeGoal; nextOrder: number },
) {
  const add = useAddGoal(); const upd = useUpdateGoal(); const del = useDeleteGoal()
  const [title, setTitle] = useState(editing?.title ?? '')

  if (!open) return null

  async function save() {
    const t = title.trim()
    if (!t) { showToast('목표를 입력해 주세요.'); return }
    try {
      if (editing) await upd.mutateAsync({ id: editing.id, title: t })
      else await add.mutateAsync({ title: t, sort_order: nextOrder })
      onClose()
    } catch { /* 실패 시 시트를 열어둔다(사유는 전역 토스트로 안내) */ }
  }

  async function remove() {
    if (!editing) return
    if (!confirm(`'${editing.title}' 목표를 삭제할까요?\n서브목표도 함께 지워집니다.`)) return
    try { await del.mutateAsync(editing.id); onClose() } catch { /* 전역 토스트 */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dim" onClick={onClose}>
      <div className="w-full max-w-md bg-surface rounded-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <button onClick={onClose} className="text-sub text-sm font-medium">닫기</button>
          <span className="font-bold text-ink">{editing ? '목표 수정' : '목표 추가'}</span>
          <button onClick={save} className="text-brand text-sm font-bold">확인</button>
        </div>
        <div>
          <label className="text-sub text-xs font-bold">목표</label>
          <div className="flex items-center gap-2 bg-card rounded-xl px-3 mt-1.5">
            <input value={title} maxLength={TITLE_MAX} autoFocus
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              placeholder="예: 사업 매출 1억" className="flex-1 bg-transparent py-2.5 outline-none text-ink" />
            <span className="text-sub text-xs shrink-0">{title.length}/{TITLE_MAX}</span>
          </div>
        </div>
        {editing && <button onClick={remove} className="w-full text-danger text-sm py-1">삭제</button>}
      </div>
    </div>
  )
}
