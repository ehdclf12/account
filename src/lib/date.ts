export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function inMonth(date: string, year: number, month: number): boolean {
  return date.startsWith(monthKey(year, month))
}

export function nextMonthFirst(year: number, month: number): string {
  const y = month === 12 ? year + 1 : year
  const m = month === 12 ? 1 : month + 1
  return `${y}-${String(m).padStart(2, '0')}-01`
}

const WEEK = ['일', '월', '화', '수', '목', '금', '토']
export function formatDayHeader(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const w = WEEK[new Date(y, m - 1, d).getDay()]
  return `${m}월 ${d}일 (${w})`
}
