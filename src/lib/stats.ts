import type { Transaction } from '@/types'
import { monthKey } from './date'

export function recentMonths(year: number, month: number, n: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = []
  for (let i = n - 1; i >= 0; i--) {
    let m = month - i, y = year
    while (m < 1) { m += 12; y-- }
    out.push({ key: monthKey(y, m), label: `${m}월` })
  }
  return out
}

export function monthlyExpense(txs: Transaction[], months: string[]): number[] {
  return months.map((mk) =>
    txs.filter((t) => t.type === 'expense' && t.date.startsWith(mk)).reduce((a, t) => a + t.amount, 0),
  )
}

export interface CatSlice { category_id: string; amount: number; pct: number }

export function categoryBreakdown(txs: Transaction[], mk: string): CatSlice[] {
  const m: Record<string, number> = {}
  let total = 0
  for (const t of txs) {
    if (t.type === 'expense' && t.date.startsWith(mk) && t.category_id) {
      m[t.category_id] = (m[t.category_id] ?? 0) + t.amount
      total += t.amount
    }
  }
  return Object.entries(m)
    .map(([category_id, amount]) => ({ category_id, amount, pct: total > 0 ? amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount)
}
