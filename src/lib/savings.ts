export function goalProgress(target: number, current: number): { pct: number; remaining: number } {
  const remaining = Math.max(0, target - current)
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  return { pct, remaining }
}

export function monthsUntil(
  year: number,
  quarter: number | null,
  now: { year: number; month: number },
): number {
  const endMonth = quarter ? quarter * 3 : 12
  const diff = (year * 12 + endMonth) - (now.year * 12 + now.month)
  return Math.max(1, diff)
}

export function monthlyNeeded(
  remaining: number,
  year: number | null,
  quarter: number | null,
  now: { year: number; month: number },
): number | null {
  if (year == null || remaining <= 0) return null
  return Math.ceil(remaining / monthsUntil(year, quarter, now))
}
