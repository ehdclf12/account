import type { Transaction } from '@/types'

export function computeFundBalance(
  householdTransfers: Transaction[],
  businessTxs: Transaction[],
): number {
  let bal = 0
  for (const t of householdTransfers) bal += t.type === 'expense' ? t.amount : -t.amount
  for (const t of businessTxs) bal += t.type === 'income' ? t.amount : -t.amount
  return bal
}
