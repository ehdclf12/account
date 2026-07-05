import type { Transaction } from '@/types'

export function computeSummary(txs: Transaction[]) {
  let income = 0, expense = 0
  for (const t of txs) {
    if (t.type === 'income') income += t.amount
    else expense += t.amount
  }
  return { income, expense, remaining: income - expense }
}
