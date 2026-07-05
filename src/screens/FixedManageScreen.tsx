import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFixedCosts, useRegisterFixedCost } from '@/hooks/useFixedCosts'
import { useTransactions } from '@/hooks/useTransactions'
import { useBusinessTransactions } from '@/hooks/useBusiness'
import { useIdentity } from '@/App'
import { fixedCostDate } from '@/lib/fixed'
import { fixedByPerson } from '@/lib/fixedPerson'
import { formatKRW } from '@/lib/format'
import { NAME_BY_ROLE } from '@/lib/users'
import FixedCostSheet from '@/components/FixedCostSheet'
import type { FixedCost } from '@/types'

export default function FixedManageScreen({ scope, backTo }: { scope: 'household' | 'business'; backTo: string }) {
  const nav = useNavigate()
  const who = useIdentity()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data: items = [] } = useFixedCosts(scope)
  const household = useTransactions(year, month)
  const business = useBusinessTransactions(year, month)
  const monthTxs = (scope === 'business' ? business.data : household.data) ?? []
  const register = useRegisterFixedCost()
  const registeredIds = new Set(monthTxs.map((t) => t.fixed_cost_id).filter(Boolean))
  const totals = fixedByPerson(items)

  const [editing, setEditing] = useState<FixedCost | null>(null)
  const [adding, setAdding] = useState(false)

  function move(delta: number) {
    let m = month + delta, y = year
    if (m < 1) { m = 12; y-- } else if (m > 12) { m = 1; y++ }
    setYear(y); setMonth(m)
  }
  const whoLabel = (w: FixedCost['who']) => (w ? NAME_BY_ROLE[w] : '공동')

  return (
    <div className="p-5 space-y-5">
      <button onClick={() => nav(backTo)} className="text-sub text-sm">‹ {scope === 'household' ? '집' : '코스모스'}</button>
      <h1 className="text-xl font-bold text-ink">고정비 관리</h1>

      <div className="flex gap-2">
        <div className="flex-1 bg-card rounded-2xl p-3">
          <p className="text-sub text-xs">{NAME_BY_ROLE.husband}</p>
          <p className="font-bold text-ink mt-1 text-sm">{formatKRW(totals.husband)}</p>
        </div>
        <div className="flex-1 bg-card rounded-2xl p-3">
          <p className="text-sub text-xs">{NAME_BY_ROLE.wife}</p>
          <p className="font-bold text-ink mt-1 text-sm">{formatKRW(totals.wife)}</p>
        </div>
        <div className="flex-1 bg-card rounded-2xl p-3">
          <p className="text-sub text-xs">공동</p>
          <p className="font-bold text-ink mt-1 text-sm">{formatKRW(totals.shared)}</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6">
        <button onClick={() => move(-1)} className="text-2xl text-sub">‹</button>
        <span className="font-bold">{year}년 {month}월</span>
        <button onClick={() => move(1)} className="text-2xl text-sub">›</button>
      </div>

      <div className="space-y-2">
        {items.length === 0 && <p className="text-sub text-sm text-center py-6">등록된 고정비가 없어요</p>}
        {items.map((f) => {
          const done = registeredIds.has(f.id)
          return (
            <div key={f.id} className="flex items-center gap-2 text-sm">
              <button onClick={() => setEditing(f)} className="flex items-center gap-2 flex-1 text-left min-w-0">
                <span className="text-sub text-xs w-8 shrink-0">{f.day}일</span>
                <span className="text-ink truncate">{f.name}</span>
                <span className="text-[10px] text-sub bg-card rounded px-1.5 py-0.5 shrink-0">{whoLabel(f.who)}</span>
              </button>
              <span className="text-ink shrink-0">{formatKRW(f.amount)}</span>
              {done ? (
                <span className="text-[#0ca30c] text-xs font-semibold w-12 text-center shrink-0">등록됨</span>
              ) : (
                <button onClick={() => register.mutate({
                  who: f.who ?? who, scope, type: 'expense', amount: f.amount, category_id: f.category_id,
                  payment_method_id: null, date: fixedCostDate(year, month, f.day), memo: f.name, fixed_cost_id: f.id,
                })} className="bg-brand text-white rounded-lg px-2 py-1 text-xs font-semibold w-12 shrink-0">등록</button>
              )}
            </div>
          )
        })}
      </div>

      <button onClick={() => setAdding(true)} className="w-full bg-brand text-white rounded-2xl py-3 font-bold">고정비 추가</button>

      {adding && <FixedCostSheet open onClose={() => setAdding(false)} scope={scope} />}
      {editing && <FixedCostSheet open onClose={() => setEditing(null)} scope={scope} editing={editing} />}
    </div>
  )
}
