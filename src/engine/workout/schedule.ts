import { KIND_GROUPS, KIND_LABEL, WEEKDAY_LONG, WEEKDAY_SHORT, waGwa } from './constants'
import type { Program, Session, WorkoutLog } from './types'

export interface ScheduleViolation {
  kind: 'interval' | 'rest'
  /** interval: 문제 되는 두 요일 [i, j] (i < j). rest: 빈 배열. */
  days: number[]
  message: string
}

const MIN_GAP_DAYS = 2 // 48시간

/** 부위 그룹이 하나라도 겹치면 같은 부위. 회복은 어느 것과도 겹치지 않는다. */
export function sessionsOverlap(a: Pick<Session, 'kind'>, b: Pick<Session, 'kind'>): boolean {
  const gb = KIND_GROUPS[b.kind]
  return KIND_GROUPS[a.kind].some((g) => gb.includes(g))
}

/** YYYY-MM-DD → 요일(월=0 … 일=6). 시간대 영향 없음. */
export function weekdayIndex(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
}

/** 운동한 날: 체크된 세트 ≥ 1, 회복 세션은 기록만 있으면. */
export function isWorkedDay(log: WorkoutLog | undefined, session: Pick<Session, 'kind'> | undefined): boolean {
  if (!log) return false
  if (session?.kind === 'recovery') return true
  return log.sets.some((s) => s.done)
}

function findSession(sessions: Session[], id: string | null | undefined): Session | undefined {
  return id ? sessions.find((s) => s.id === id) : undefined
}

/** 같은 부위 48시간(주 순환) 규칙과 회복·휴식일 ≥ 1 규칙 검사. */
export function checkSchedule(weekSchedule: (string | null)[], sessions: Session[]): ScheduleViolation[] {
  const out: ScheduleViolation[] = []
  const at = weekSchedule.map((id) => findSession(sessions, id))
  for (let i = 0; i < 7; i++) {
    for (let j = i + 1; j < 7; j++) {
      const a = at[i]
      const b = at[j]
      if (!a || !b || !sessionsOverlap(a, b)) continue
      const gap = Math.min(j - i, 7 - (j - i))
      if (gap >= MIN_GAP_DAYS) continue
      out.push({
        kind: 'interval', days: [i, j],
        message: `${a.name}(${WEEKDAY_SHORT[i]})${waGwa(a.name)} ${b.name}(${WEEKDAY_SHORT[j]}) 사이가 ${gap * 24}시간이에요 — 같은 부위는 48시간 이상 필요해요`,
      })
    }
  }
  const hasRest = at.some((s) => !s || s.kind === 'recovery')
  if (!hasRest) out.push({ kind: 'rest', days: [], message: '회복·휴식일이 하루 이상 있어야 해요' })
  return out
}

function swapped(ws: (string | null)[], a: number, b: number): (string | null)[] {
  const next = [...ws]
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}

/**
 * 두 요일의 세션을 맞바꾼다. violations가 있으면 경고하고, alternatives는
 * 원래 요일 a의 세션과 바꿔도 규칙을 지키는 다른 요일 목록이다(같은 세션 요일 제외).
 */
export function swapDays(program: Program, a: number, b: number): {
  program: Program; violations: ScheduleViolation[]; alternatives: number[]
} {
  const ws = program.weekSchedule
  const next = swapped(ws, a, b)
  const violations = checkSchedule(next, program.sessions)
  const alternatives: number[] = []
  for (let c = 0; c < 7; c++) {
    if (c === a || ws[c] === ws[a]) continue
    if (checkSchedule(swapped(ws, a, c), program.sessions).length === 0) alternatives.push(c)
  }
  return { program: { ...program, weekSchedule: next }, violations, alternatives }
}

/**
 * 요일별 "직전 같은 부위와의 간격" 문구. weekLogs는 이번 주 기록, todayIndex는 오늘 요일(월=0).
 * 지난 요일은 실제로 운동한 날만, 오늘·이후는 기록의 sessionId(오늘만 바꾸기) 또는 주간 계획대로 한다고 본다.
 * 휴식·회복 요일은 빈 문자열.
 */
export function intervalTexts(program: Program, weekLogs: WorkoutLog[], todayIndex: number): string[] {
  const logAt: (WorkoutLog | undefined)[] = Array.from({ length: 7 }, () => undefined)
  for (const l of weekLogs) logAt[weekdayIndex(l.date)] = l
  const effective = program.weekSchedule.map((id, d) => findSession(program.sessions, logAt[d]?.sessionId ?? id))
  const counts = effective.map((s, d) => {
    if (!s) return false
    if (d < todayIndex) return isWorkedDay(logAt[d], s)
    return true
  })
  return effective.map((s, d) => {
    if (!s || s.kind === 'recovery') return ''
    for (let e = d - 1; e >= 0; e--) {
      const prev = effective[e]
      if (counts[e] && prev && sessionsOverlap(prev, s)) {
        return `${KIND_LABEL[prev.kind]} ${WEEKDAY_LONG[e]} 이후 ${(d - e) * 24}시간`
      }
    }
    return '이번 주 처음'
  })
}
