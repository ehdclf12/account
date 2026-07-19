export function fixedCostDate(year: number, month: number, day: number): string {
  const last = new Date(year, month, 0).getDate()
  // 하한 1: day<=0이면 "2026-07-00" 같은 깨진 문자열이 되어 모든 월 필터에서 누락된다.
  const d = Math.min(Math.max(1, day), last)
  return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
