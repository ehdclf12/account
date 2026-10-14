import { weekdayIndex } from './schedule'
import type { Program, SetEntry, Session, WorkoutLog } from './types'

export type SessionStatus = 'todo' | 'in_progress' | 'done'

/** 회복 세션 완료 표식: exerciseId 'recovery', done true인 SetEntry 하나. */
export const RECOVERY_EXERCISE_ID = 'recovery'

function addDaysISO(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/** 오늘 할 세션 id. 오늘 기록이 있으면 그 세션(오늘만 바꾸기), 없으면 주간 루틴. null = 휴식. */
export function todaySession(program: Program, logs: WorkoutLog[], todayISO: string): string | null {
  const today = logs.find((l) => l.date === todayISO)
  if (today) return today.sessionId
  return program.weekSchedule[weekdayIndex(todayISO)] ?? null
}

/** 오늘이 속한 주(월~일)의 기록. */
export function thisWeekLogs(logs: WorkoutLog[], todayISO: string): WorkoutLog[] {
  const monday = addDaysISO(todayISO, -weekdayIndex(todayISO))
  const sunday = addDaysISO(monday, 6)
  return logs.filter((l) => l.date >= monday && l.date <= sunday)
}

/**
 * 세션 상태. 체크된 세트 0 = todo, 일부 = in_progress, 슬롯 세트 전부 = done.
 * 회복 세션은 체크된 세트(= 'recovery' 표식 하나)가 있으면 done.
 */
export function sessionStatus(log: WorkoutLog | undefined, session: Session): SessionStatus {
  const done = new Set<string>()
  for (const s of log?.sets ?? []) if (s.done) done.add(`${s.exerciseId}#${s.setIndex}`)
  if (done.size === 0) return 'todo'
  if (session.kind === 'recovery') return 'done'
  const total = session.slots.reduce((n, sl) => n + sl.sets, 0)
  return done.size >= total ? 'done' : 'in_progress'
}

/** (exerciseId,setIndex)가 같은 세트를 교체하거나 추가한 새 로그. 원본은 바꾸지 않는다. */
export function upsertSet(
  log: WorkoutLog | undefined, date: string, sessionId: string, entry: SetEntry,
): WorkoutLog {
  const base: WorkoutLog = log ?? { date, sessionId, sets: [] }
  const i = base.sets.findIndex((s) => s.exerciseId === entry.exerciseId && s.setIndex === entry.setIndex)
  const sets = i < 0 ? [...base.sets, entry] : base.sets.map((s, j) => (j === i ? entry : s))
  return { ...base, sets }
}
