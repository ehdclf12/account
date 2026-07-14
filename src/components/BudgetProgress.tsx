import { useNavigate } from 'react-router-dom'
import { useBudgets } from '@/hooks/useBudgets'
import { spentByCategory, computeBudget } from '@/lib/budget'
import { formatKRW } from '@/lib/format'
import type { Category, Transaction } from '@/types'

export default function BudgetProgress(
  { month, categories, monthTxs, editTo }:
  { month: string; categories: Category[]; monthTxs: Transaction[]; editTo: string },
) {
  const nav = useNavigate()
  const { data: budgets = [] } = useBudgets(month)
  const { totalBudget, totalSpent, lines } = computeBudget(budgets, spentByCategory(monthTxs))
  const name = new Map(categories.map((c) => [c.id, c.name]))

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-ink">예산</span>
        <button onClick={() => nav(editTo)} className="text-brand text-sm font-medium">편집</button>
      </div>
      {totalBudget === 0 ? (
        <p className="text-sub text-sm py-2">예산을 설정해보세요</p>
      ) : (
        <>
          <div className="bg-card rounded-2xl p-4 mb-3">
            <div className="flex justify-between text-sm">
              <span className="text-sub">사용 {formatKRW(totalSpent)}</span>
              <span className="text-sub">예산 {formatKRW(totalBudget)}</span>
            </div>
            <div className="h-2 bg-surface rounded-full mt-2 overflow-hidden">
              <div className={`h-full rounded-full ${totalSpent > totalBudget ? 'bg-danger' : 'bg-brand'}`}
                style={{ width: `${Math.min(100, Math.round((totalSpent / totalBudget) * 100))}%` }} />
            </div>
          </div>
          <div className="space-y-3">
            {lines.map((l) => (
              <div key={l.category_id}>
                <div className="flex justify-between text-sm">
                  <span className="text-ink">{name.get(l.category_id) ?? '기타'}</span>
                  <span className={l.over ? 'text-danger' : 'text-sub'}>
                    {formatKRW(l.spent)} / {formatKRW(l.budget)}
                    {l.over ? ` · ${formatKRW(-l.remaining)} 초과` : ''}
                  </span>
                </div>
                <div className="h-1.5 bg-card rounded-full mt-1 overflow-hidden">
                  <div className={`h-full rounded-full ${l.over ? 'bg-danger' : 'bg-brand'}`}
                    style={{ width: `${Math.min(100, Math.round((l.spent / l.budget) * 100))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
