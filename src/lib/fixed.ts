export function fixedCostDate(year: number, month: number, day: number): string {
  const last = new Date(year, month, 0).getDate()
  const d = Math.min(day, last)
  return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
