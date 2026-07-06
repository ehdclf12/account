export function assetSign(type: string): 1 | -1 {
  return type === 'liability' ? -1 : 1
}

export function computeNetWorth(
  rows: { type: string; amount: number }[],
  savingsTotal: number,
): { total: number; byType: Record<string, number> } {
  const byType: Record<string, number> = {}
  let total = 0
  for (const row of rows) {
    byType[row.type] = (byType[row.type] ?? 0) + row.amount
    total += assetSign(row.type) * row.amount
  }
  byType.savings = savingsTotal
  total += savingsTotal
  return { total, byType }
}
