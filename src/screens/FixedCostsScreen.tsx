import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCategories } from '@/hooks/useCategories'
import { useBusinessCategories } from '@/hooks/useBusiness'
import { useFixedCosts, useAddFixedCost, useDeleteFixedCost } from '@/hooks/useFixedCosts'
import { formatKRW } from '@/lib/format'
import type { Category, Scope } from '@/types'

export default function FixedCostsScreen({ scope, backTo }: { scope: Scope; backTo: string }) {
  const nav = useNavigate()
  const household = useCategories()
  const business = useBusinessCategories()
  const cats: Category[] = ((scope === 'business' ? business.data : household.data) ?? []).filter((c) => c.type === 'expense')
  const { data: items = [] } = useFixedCosts(scope)
  const add = useAddFixedCost(); const del = useDeleteFixedCost()

  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [day, setDay] = useState('1')

  function submit() {
    const amt = Number(amount) || 0
    const d = Math.min(31, Math.max(1, Number(day) || 1))
    if (!name || amt <= 0) return
    add.mutate({ scope, name, amount: amt, category_id: categoryId || null, day: d, active: true })
    setName(''); setAmount(''); setCategoryId(''); setDay('1')
  }

  return (
    <div className="p-5 space-y-5">
      <button onClick={() => nav(backTo)} className="text-sub text-sm">‹ 뒤로</button>
      <h1 className="text-xl font-bold text-ink">고정비 편집</h1>
      <div className="space-y-1">
        {items.map((f) => (
          <div key={f.id} className="flex items-center gap-2 text-sm">
            <span className="text-sub text-xs w-8">{f.day}일</span>
            <span className="text-ink flex-1 truncate">{f.name}</span>
            <span className="text-ink">{formatKRW(f.amount)}</span>
            <button onClick={() => del.mutate(f.id)} className="text-sub text-xs ml-2">삭제</button>
          </div>
        ))}
        {items.length === 0 && <p className="text-sub text-sm">등록된 고정비가 없어요</p>}
      </div>
      <div className="bg-card rounded-2xl p-4 space-y-2">
        <p className="font-bold text-ink text-sm">고정비 추가</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름 (예: 월세)" className="w-full bg-white rounded-xl px-3 py-2 outline-none" />
        <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="금액" className="w-full bg-white rounded-xl px-3 py-2 outline-none" />
        <div className="flex gap-2">
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="flex-1 bg-white rounded-xl px-3 py-2 outline-none">
            <option value="">카테고리</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex items-center gap-1">
            <input value={day} onChange={(e) => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" className="w-14 bg-white rounded-xl px-3 py-2 text-right outline-none" />
            <span className="text-sub text-sm">일</span>
          </div>
        </div>
        <button onClick={submit} className="w-full bg-brand text-white rounded-xl py-2 font-semibold">추가</button>
      </div>
    </div>
  )
}
