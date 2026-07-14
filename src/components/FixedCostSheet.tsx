import { useState } from 'react'
import { useCategories } from '@/hooks/useCategories'
import { useBusinessCategories } from '@/hooks/useBusiness'
import { useAddFixedCost, useUpdateFixedCost, useDeleteFixedCost } from '@/hooks/useFixedCosts'
import { NAME_BY_ROLE } from '@/lib/users'
import type { Category, FixedCost, Role, Scope } from '@/types'

export default function FixedCostSheet(
  { open, onClose, scope, editing }:
  { open: boolean; onClose: () => void; scope: Scope; editing?: FixedCost },
) {
  const household = useCategories()
  const business = useBusinessCategories()
  const cats: Category[] = ((scope === 'business' ? business.data : household.data) ?? []).filter((c) => c.type === 'expense')
  const add = useAddFixedCost(); const upd = useUpdateFixedCost(); const del = useDeleteFixedCost()

  const [name, setName] = useState(editing?.name ?? '')
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '')
  const [categoryId, setCategoryId] = useState(editing?.category_id ?? '')
  const [day, setDay] = useState(String(editing?.day ?? 1))
  const [whoVal, setWhoVal] = useState<Role | ''>(editing?.who ?? '')

  if (!open) return null

  async function save() {
    const amt = Number(amount) || 0
    const d = Math.min(31, Math.max(1, Number(day) || 1))
    if (!name || amt <= 0) return
    const payload = { name, amount: amt, category_id: categoryId || null, day: d, who: whoVal || null }
    if (editing) await upd.mutateAsync({ id: editing.id, ...payload })
    else await add.mutateAsync({ scope, active: true, ...payload })
    onClose()
  }

  async function remove() {
    if (editing && confirm('이 고정비를 삭제할까요?')) { await del.mutateAsync(editing.id); onClose() }
  }

  const roles: (Role | '')[] = ['', 'husband', 'wife']
  const roleLabel = (r: Role | '') => (r === '' ? '공동' : NAME_BY_ROLE[r])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <span className="font-bold text-ink">{editing ? '고정비 수정' : '고정비 추가'}</span>
          <button onClick={onClose} className="text-sub text-sm font-medium">닫기</button>
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름 (예: 월세)" className="w-full bg-card rounded-xl px-3 py-2 outline-none" />
        <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="금액" className="w-full bg-card rounded-xl px-3 py-2 outline-none" />
        <div className="flex gap-2">
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="flex-1 bg-card rounded-xl px-3 py-2 outline-none">
            <option value="">카테고리</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex items-center gap-1">
            <input value={day} onChange={(e) => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" className="w-14 bg-card rounded-xl px-3 py-2 text-right outline-none" />
            <span className="text-sub text-sm">일</span>
          </div>
        </div>
        <div>
          <p className="text-sub text-sm mb-1">담당자</p>
          <div className="flex bg-card rounded-2xl p-1">
            {roles.map((r) => (
              <button key={r || 'shared'} onClick={() => setWhoVal(r)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold ${whoVal === r ? 'bg-white shadow text-ink' : 'text-sub'}`}>
                {roleLabel(r)}
              </button>
            ))}
          </div>
        </div>
        <button onClick={save} className="w-full bg-brand text-white rounded-2xl py-3 font-bold">저장하기</button>
        {editing && <button onClick={remove} className="w-full text-danger text-sm py-1">삭제</button>}
      </div>
    </div>
  )
}
