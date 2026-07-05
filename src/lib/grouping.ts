import type { Transaction } from '@/types'

export function groupByDate(txs: Transaction[]) {
  const map = new Map<string, Transaction[]>()
  for (const t of txs) {
    if (!map.has(t.date)) map.set(t.date, [])
    map.get(t.date)!.push(t)
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, items]) => ({ date, items }))
}
