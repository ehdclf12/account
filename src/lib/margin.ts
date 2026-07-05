export interface MarginResult {
  unitCost: number
  unitProfit: number
  marginRate: number // 0..1
  costRate: number   // 0..1
  totalProfit: number
  totalRevenue: number
}

export function calcMargin(price: number, cost: number, extra: number, qty: number): MarginResult {
  const unitCost = cost + extra
  const unitProfit = price - unitCost
  const marginRate = price > 0 ? unitProfit / price : 0
  const costRate = price > 0 ? unitCost / price : 0
  return {
    unitCost,
    unitProfit,
    marginRate,
    costRate,
    totalProfit: unitProfit * qty,
    totalRevenue: price * qty,
  }
}

export function recommendPrice(cost: number, extra: number, targetMarginRate: number): number {
  const unitCost = cost + extra
  if (targetMarginRate >= 1) return 0
  return Math.round(unitCost / (1 - targetMarginRate))
}
