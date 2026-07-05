import { useNavigate } from 'react-router-dom'
import { useFixedCosts, useRegisterFixedCost } from '@/hooks/useFixedCosts'
import { useIdentity } from '@/App'
import { fixedCostDate } from '@/lib/fixed'
import { formatKRW } from '@/lib/format'
import type { Transaction, Scope } from '@/types'

export default function FixedCostsSection(
  { scope, year, month, monthTxs, editTo }:
  { scope: Scope; year: number; month: number; monthTxs: Transaction[]; editTo: string },
) {
  const nav = useNavigate()
  const who = useIdentity()
  const { data: items = [] } = useFixedCosts(scope)
  const register = useRegisterFixedCost()
  const registeredIds = new Set(monthTxs.map((t) => t.fixed_cost_id).filter(Boolean))

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-ink">고정비</span>
        <button onClick={() => nav(editTo)} className="text-brand text-sm font-medium">편집</button>
      </div>
      {items.length === 0 ? (
        <p className="text-sub text-sm py-2">고정비를 등록해보세요</p>
      ) : (
        <div className="space-y-2">
          {items.map((f) => {
            const done = registeredIds.has(f.id)
            return (
              <div key={f.id} className="flex items-center gap-3 text-sm">
                <span className="text-sub text-xs w-8">{f.day}일</span>
                <span className="text-ink flex-1 truncate">{f.name}</span>
                <span className="text-ink">{formatKRW(f.amount)}</span>
                {done ? (
                  <span className="text-[#0ca30c] text-xs font-semibold w-12 text-center">등록됨</span>
                ) : (
                  <button
                    onClick={() => register.mutate({
                      who, scope, type: 'expense', amount: f.amount, category_id: f.category_id,
                      payment_method_id: null, date: fixedCostDate(year, month, f.day), memo: f.name, fixed_cost_id: f.id,
                    })}
                    className="bg-brand text-white rounded-lg px-2 py-1 text-xs font-semibold w-12">등록</button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
