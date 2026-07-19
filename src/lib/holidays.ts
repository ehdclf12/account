export type DayTone = 'red' | 'blue' | 'normal'
export type HolidayMap = Record<string, string>

export function holidayName(iso: string, map: HolidayMap): string | null {
  return map[iso] ?? null
}

// 공휴일 > 일요일 > 토요일 순으로 판정한다.
// 'T00:00:00'을 붙여 로컬 자정으로 고정한다(안 붙이면 UTC로 파싱돼 하루 밀린다).
export function weekdayTone(iso: string, map: HolidayMap): DayTone {
  if (map[iso] !== undefined) return 'red'
  const day = new Date(`${iso}T00:00:00`).getDay()
  if (day === 0) return 'red' // 일
  if (day === 6) return 'blue' // 토
  return 'normal'
}
