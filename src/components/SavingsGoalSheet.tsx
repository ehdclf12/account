import { useState } from 'react'
import { useAddSavingsGoal, useUpdateSavingsGoal, useDeleteSavingsGoal } from '@/hooks/useSavingsGoals'
import type { SavingsGoal } from '@/types'

export default function SavingsGoalSheet(
  { open, onClose, editing }: { open: boolean; onClose: () => void; editing?: SavingsGoal },
) {
  const add = useAddSavingsGoal(); const upd = useUpdateSavingsGoal(); const del = useDeleteSavingsGoal()

  const [name, setName] = useState(editing?.name ?? '')
  const [amount, setAmount] = useState(editing ? String(editing.target_amount) : '')
  const [year, setYear] = useState<string>(editing?.target_year != null ? String(editing.target_year) : '')
  const [quarter, setQuarter] = useState<string>(editing?.target_quarter != null ? String(editing.target_quarter) : '')

  if (!open) return null

  const thisYear = new Date().getFullYear()
  const years = Array.from({ length: 8 }, (_, i) => thisYear + i)

  async function save() {
    const amt = Number(amount) || 0
    if (!name || amt <= 0) return
    const y = year ? Number(year) : null
    const payload = {
      name,
      target_amount: amt,
      target_year: y,
      target_quarter: y && quarter ? Number(quarter) : null,
      active: true,
    }
    if (editing) await upd.mutateAsync({ id: editing.id, ...payload })
    else await add.mutateAsync(payload)
    onClose()
  }

  async function remove() {
    if (editing && confirm('이 저축 목표를 삭제할까요?')) { await del.mutateAsync(editing.id); onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dim" onClick={onClose}>
      <div className="w-full max-w-md bg-surface rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <span className="font-bold text-ink">{editing ? '저축 목표 수정' : '저축 목표 추가'}</span>
          <button onClick={onClose} className="text-sub text-sm font-medium">닫기</button>
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름 (예: 여행자금)" className="w-full bg-card rounded-xl px-3 py-2 outline-none" />
        <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="목표 금액" className="w-full bg-card rounded-xl px-3 py-2 outline-none" />
        <div>
          <p className="text-sub text-sm mb-1">기한 (선택)</p>
          <div className="flex gap-2">
            <select value={year} onChange={(e) => setYear(e.target.value)} className="flex-1 bg-card rounded-xl px-3 py-2 outline-none">
              <option value="">기한 없음</option>
              {years.map((y) => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select value={quarter} onChange={(e) => setQuarter(e.target.value)} disabled={!year} className="flex-1 bg-card rounded-xl px-3 py-2 outline-none disabled:opacity-50">
              <option value="">연말까지</option>
              {[1, 2, 3, 4].map((q) => <option key={q} value={q}>{q}분기</option>)}
            </select>
          </div>
        </div>
        <button onClick={save} className="w-full bg-brand text-white rounded-2xl py-3 font-bold">저장하기</button>
        {editing && <button onClick={remove} className="w-full text-danger text-sm py-1">삭제</button>}
      </div>
    </div>
  )
}
