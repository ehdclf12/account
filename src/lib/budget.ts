import type { Transaction } from '@/types'

export function spentByCategory(txs: Transaction[]): Record<string, number> {
  const m: Record<string, number> = {}
  for (const t of txs) {
    if (t.type === 'expense' && t.category_id) m[t.category_id] = (m[t.category_id] ?? 0) + t.amount
  }
  return m
}

export interface BudgetLine {
  category_id: string
  budget: number
  spent: number
  remaining: number
  over: boolean
}

export function computeBudget(
  budgets: { category_id: string; amount: number }[],
  spent: Record<string, number>,
): { totalBudget: number; totalSpent: number; lines: BudgetLine[] } {
  const lines: BudgetLine[] = budgets
    .filter((b) => b.amount > 0)
    .map((b) => {
      const s = spent[b.category_id] ?? 0
      return { category_id: b.category_id, budget: b.amount, spent: s, remaining: b.amount - s, over: s > b.amount }
    })
  const totalBudget = lines.reduce((a, l) => a + l.budget, 0)
  const totalSpent = lines.reduce((a, l) => a + l.spent, 0)
  return { totalBudget, totalSpent, lines }
}
