import type { ArchiveItem } from '@/types'

export interface DayCell {
  iso: string
  day: number
  inMonth: boolean
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// 6주 × 7일 = 42칸 고정. 월마다 행 수가 바뀌면 그리드 높이가 출렁여서다.
export function monthGrid(year: number, month: number): DayCell[] {
  const first = new Date(year, month - 1, 1)
  const offset = (first.getDay() + 6) % 7 // 일=0인 getDay()를 월=0으로 옮긴다
  const cells: DayCell[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month - 1, 1 - offset + i)
    cells.push({
      iso: iso(d.getFullYear(), d.getMonth() + 1, d.getDate()),
      day: d.getDate(),
      inMonth: d.getFullYear() === year && d.getMonth() === month - 1,
    })
  }
  return cells
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

// 캘린더에 뜨는 조건: 기한 있는 · 보관 안 된 · 체크리스트
export function calendarItems(items: ArchiveItem[]): ArchiveItem[] {
  return items.filter((i) => i.kind === 'checklist' && !i.archived && !!i.due_date)
}

export function groupByDue(items: ArchiveItem[]): Record<string, ArchiveItem[]> {
  const map: Record<string, ArchiveItem[]> = {}
  for (const i of items) {
    if (!i.due_date) continue
    ;(map[i.due_date] ??= []).push(i)
  }
  return map
}

// 빈 체크리스트는 '완료'가 아니다. true면 항목 없는 카드가 전부 취소선이 된다.
export function isAllDone(item: ArchiveItem): boolean {
  const cs = item.checklist ?? []
  return cs.length > 0 && cs.every((c) => c.done)
}
