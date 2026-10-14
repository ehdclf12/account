import { RECOVERY_EXERCISE_ID } from './constants'
import { weekdayIndex } from './schedule'
import type { Program, SetEntry, Session, WorkoutLog } from './types'

export type SessionStatus = 'todo' | 'in_progress' | 'done'

export { RECOVERY_EXERCISE_ID }

function addDaysISO(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/** 세션 id로 프로그램에서 세션을 찾는다. todaySession이 돌려준 id가 program.sessions에 없을 수 있으므로(재생성 등) 호출부는 undefined를 처리한다. */
export function findSession(program: Program, id: string | null | undefined): Session | undefined {
  return id ? program.sessions.find((s) => s.id === id) : undefined
}

/** 오늘 할 세션 id (program.sessions에 없는 id일 수 있음 → findSession). 오늘 기록이 있으면 그 세션(오늘만 바꾸기), 없으면 주간 루틴. null = 휴식. */
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
 * 회복 세션은 'recovery' 표식(done)이 있으면 done. 체크 해제는 done:false로 기록되어 엔트리가 남는다.
 */
export function sessionStatus(log: WorkoutLog | undefined, session: Session): SessionStatus {
  const sets = (log?.sets ?? []).filter((s) => s.done)
  if (session.kind === 'recovery') {
    return sets.some((s) => s.exerciseId === RECOVERY_EXERCISE_ID) ? 'done' : 'todo'
  }
  // 세션 슬롯에 속한 세트만 센다(오래된·타 세션 엔트리 무시).
  const setsOf = new Map<string, number>()
  for (const sl of session.slots) setsOf.set(sl.exerciseId, (setsOf.get(sl.exerciseId) ?? 0) + sl.sets)
  const done = new Set<string>()
  for (const s of sets) {
    if (s.setIndex >= 0 && s.setIndex < (setsOf.get(s.exerciseId) ?? 0)) done.add(`${s.exerciseId}#${s.setIndex}`)
  }
  if (done.size === 0) return 'todo'
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
