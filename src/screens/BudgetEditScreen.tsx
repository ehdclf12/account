import { useState } from 'react'
import { useCategories } from '@/hooks/useCategories'
import { useBusinessCategories } from '@/hooks/useBusiness'
import { useBudgets, useSetBudget } from '@/hooks/useBudgets'
import { monthKey } from '@/lib/date'
import NavButton from '@/components/NavButton'
import type { Category } from '@/types'

export default function BudgetEditScreen({ scope, backTo }: { scope: 'household' | 'business'; backTo: string }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const mkey = monthKey(year, month)

  const household = useCategories()
  const business = useBusinessCategories()
  const cats: Category[] = (scope === 'business' ? business.data : household.data) ?? []
  const expenseCats = cats.filter((c) => c.type === 'expense')

  const { data: budgets = [] } = useBudgets(mkey)
  const setBudget = useSetBudget()
  const amountFor = (cid: string) => budgets.find((b) => b.category_id === cid)?.amount ?? 0

  function move(delta: number) {
    let m = month + delta, y = year
    if (m < 1) { m = 12; y-- } else if (m > 12) { m = 1; y++ }
    setYear(y); setMonth(m)
  }

  return (
    <div className="p-5 space-y-5">
      <NavButton to={backTo} label="뒤로" />
      <h1 className="text-xl font-bold text-ink">예산 편집</h1>
      <div className="flex items-center justify-center gap-6">
        <button onClick={() => move(-1)} className="text-2xl text-sub">‹</button>
        <span className="font-bold">{year}년 {month}월</span>
        <button onClick={() => move(1)} className="text-2xl text-sub">›</button>
      </div>
      <div className="space-y-2">
        {expenseCats.map((c) => (
          <BudgetRow key={c.id + mkey} name={c.name} initial={amountFor(c.id)}
            onSave={(amt) => setBudget.mutate({ category_id: c.id, month: mkey, amount: amt })} />
        ))}
        {expenseCats.length === 0 && <p className="text-sub text-sm">지출 카테고리가 없어요</p>}
      </div>
    </div>
  )
}

function BudgetRow({ name, initial, onSave }: { name: string; initial: number; onSave: (amt: number) => void }) {
  const [val, setVal] = useState(initial ? String(initial) : '')
  return (
    <div className="flex items-center gap-3">
      <span className="text-ink text-sm flex-1">{name}</span>
      <input value={val} onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))}
        onBlur={() => onSave(Number(val) || 0)} inputMode="numeric" placeholder="0"
        className="w-32 bg-card rounded-xl px-3 py-2 text-right outline-none" />
      <span className="text-sub text-sm">원</span>
    </div>
  )
}
