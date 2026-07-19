export function goalProgress(target: number, current: number): { pct: number; remaining: number } {
  const remaining = Math.max(0, target - current)
  // 내림: 99.5%가 100%로 반올림돼 "완료"로 보이는 것을 막는다.
  const pct = target > 0 ? Math.min(100, Math.max(0, Math.floor((current / target) * 100))) : 0
  return { pct, remaining }
}

export function monthsUntil(
  year: number,
  quarter: number | null,
  now: { year: number; month: number },
): number {
  const endMonth = quarter ? quarter * 3 : 12
  // 이번 달도 저축할 수 있으므로 양끝을 포함해 센다(+1).
  const diff = (year * 12 + endMonth) - (now.year * 12 + now.month) + 1
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
