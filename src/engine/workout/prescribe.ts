import type { Exercise, SetEntry, Slot, WorkoutLog } from './types'

export interface Prescription {
  weightKg: number | null
  targetReps: number[]
  reason: string
}

export const FIRST_TIME_REASON = '처음 하는 종목이에요 → 목표 횟수를 겨우 채울 무게보다 한 단계 가볍게 시작하세요'

/** Epley 추정 1RM, 소수 1자리. */
export function e1rm(weightKg: number, reps: number): number {
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10
}

/** 종목별 수행일(체크된 세트가 1개 이상인 날) — 최신순, 각 날짜의 체크된 세트는 setIndex 순. */
export function performances(history: WorkoutLog[], exerciseId: string, before?: string): { date: string; sets: SetEntry[] }[] {
  return history
    .filter((l) => before === undefined || l.date < before)
    .map((l) => ({
      date: l.date,
      sets: l.sets.filter((s) => s.exerciseId === exerciseId && s.done).sort((a, b) => a.setIndex - b.setIndex),
    }))
    .filter((p) => p.sets.length > 0)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

const fmtKg = (n: number) => String(Math.round(n * 100) / 100)
const fill = (n: number, v: number) => Array.from({ length: n }, () => v)

/**
 * 다음 처방. history에는 오늘 이전 기록을 넘기거나 `before`(YYYY-MM-DD, 그 날짜 포함 이후 무시)를 준다.
 */
export function prescribe(
  history: WorkoutLog[], slot: Slot, exercise: Exercise, options: { before?: string } = {},
): Prescription {
  const perf = performances(history, exercise.id, options.before)
  const { sets, repMin, repMax } = slot
  if (perf.length === 0) return { weightKg: null, targetReps: fill(sets, repMax), reason: FIRST_TIME_REASON }

  const last = perf[0].sets
  const base = last[0].weightKg
  const inc = exercise.weightIncrementKg

  if (last.every((s) => s.reps >= repMax)) {
    if (base === null) {
      return {
        weightKg: null, targetReps: fill(sets, repMax),
        reason: `지난번 ${last.length}세트 모두 ${repMax}회 성공 → 무게를 더해 보세요`,
      }
    }
    return {
      weightKg: base + inc, targetReps: fill(sets, repMin),
      reason: `지난번 ${last.length}세트 모두 ${repMax}회 성공 → ${fmtKg(inc)}kg 올려보세요`,
    }
  }

  if (last[0].reps < repMin) {
    const prev = perf[1]
    if (prev && prev.sets[0].reps < repMin) {
      const cut = base === null ? null : Math.floor((base * 0.9) / inc + 1e-9) * inc
      return { weightKg: cut, targetReps: fill(sets, repMin), reason: '2회 연속 목표 미달 → 10% 낮춰 다시 쌓아가요' }
    }
    return { weightKg: base, targetReps: fill(sets, repMin), reason: '이번엔 목표에 못 미쳤어요 → 같은 무게로 재도전' }
  }

  const targetReps = Array.from({ length: sets }, (_, i) => {
    const prior = last[Math.min(i, last.length - 1)].reps
    return Math.min(prior + 1, repMax)
  })
  return { weightKg: base, targetReps, reason: '같은 무게에서 횟수를 1개씩 늘려보세요' }
}
