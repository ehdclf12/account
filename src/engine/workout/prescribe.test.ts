import { describe, it, expect } from 'vitest'
import { prescribe, e1rm, FIRST_TIME_REASON } from './prescribe'
import { getExercise } from '@/data/workout/exercises'
import type { SetEntry, Slot, WorkoutLog } from './types'

const bench = getExercise('barbell-bench-press')! // 상체 2.5
const squat = getExercise('back-squat')! // 하체 5
const slot = (over: Partial<Slot> = {}): Slot => ({
  id: 's', pattern: 'h_push', type: 'compound', role: 'main', sets: 3, repMin: 6, repMax: 10,
  exerciseId: bench.id, reason: '', ...over,
})
const sets = (exerciseId: string, rows: [number | null, number, boolean?][]): SetEntry[] =>
  rows.map(([weightKg, reps, done = true], setIndex) => ({ exerciseId, setIndex, weightKg, reps, done }))
const log = (date: string, entries: SetEntry[]): WorkoutLog => ({ date, sessionId: 'shoulder-a', sets: entries })

describe('prescribe', () => {
  it('기록 없음 → 무게 비움 + 첫 기록 안내, 목표는 repMax', () => {
    const r = prescribe([], slot(), bench)
    expect(r).toEqual({ weightKg: null, targetReps: [10, 10, 10], reason: FIRST_TIME_REASON })
    expect(FIRST_TIME_REASON).toBe('처음 하는 종목이에요 → 목표 횟수를 겨우 채울 무게보다 한 단계 가볍게 시작하세요')
  })
  it('다른 종목·체크 안 된 세트뿐이면 기록 없음과 같다', () => {
    const h = [log('2026-10-10', sets('cable-fly', [[20, 12]])), log('2026-10-11', sets(bench.id, [[60, 10, false]]))]
    expect(prescribe(h, slot(), bench).weightKg).toBeNull()
  })
  it('체크된 세트 전부 repMax 이상 → 증량, 목표 repMin', () => {
    const h = [log('2026-10-10', sets(bench.id, [[60, 10], [60, 11], [60, 10]]))]
    expect(prescribe(h, slot(), bench)).toEqual({
      weightKg: 62.5, targetReps: [6, 6, 6], reason: '지난번 3세트 모두 10회 성공 → 2.5kg 올려보세요',
    })
  })
  it('하체는 5kg 증량', () => {
    const h = [log('2026-10-10', sets(squat.id, [[100, 8], [100, 8]]))]
    const r = prescribe(h, slot({ repMin: 6, repMax: 8, sets: 4, exerciseId: squat.id }), squat)
    expect(r.weightKg).toBe(105)
    expect(r.targetReps).toEqual([6, 6, 6, 6])
    expect(r.reason).toBe('지난번 2세트 모두 8회 성공 → 5kg 올려보세요')
  })
  it('체크 안 된 세트는 무시한다(미달 세트가 체크 안 됐으면 증량)', () => {
    const h = [log('2026-10-10', sets(bench.id, [[60, 10], [60, 10], [60, 4, false]]))]
    const r = prescribe(h, slot(), bench)
    expect(r.weightKg).toBe(62.5)
    expect(r.reason).toBe('지난번 2세트 모두 10회 성공 → 2.5kg 올려보세요')
  })
  it('한 세트라도 repMax 미만이면 증량하지 않고 세트마다 +1(최대 repMax)', () => {
    const h = [log('2026-10-10', sets(bench.id, [[60, 10], [60, 9], [60, 7]]))]
    expect(prescribe(h, slot(), bench)).toEqual({
      weightKg: 60, targetReps: [10, 10, 8], reason: '같은 무게에서 횟수를 1개씩 늘려보세요',
    })
  })
  it('첫 세트가 정확히 repMin이면 미달이 아니다', () => {
    const h = [
      log('2026-10-08', sets(bench.id, [[60, 5]])),
      log('2026-10-10', sets(bench.id, [[60, 6], [60, 5], [60, 5]])),
    ]
    const r = prescribe(h, slot(), bench)
    expect(r.weightKg).toBe(60)
    expect(r.targetReps).toEqual([7, 6, 6])
    expect(r.reason).toBe('같은 무게에서 횟수를 1개씩 늘려보세요')
  })
  it('슬롯 세트가 기록보다 많으면 마지막 세트 기준 +1', () => {
    const h = [log('2026-10-10', sets(bench.id, [[60, 8], [60, 7]]))]
    expect(prescribe(h, slot({ sets: 4 }), bench).targetReps).toEqual([9, 8, 8, 8])
  })
  it('첫 세트 repMin 미만(처음) → 무게 유지 재도전', () => {
    const h = [
      log('2026-10-08', sets(bench.id, [[60, 6]])),
      log('2026-10-10', sets(bench.id, [[62.5, 5], [62.5, 5]])),
    ]
    expect(prescribe(h, slot(), bench)).toEqual({
      weightKg: 62.5, targetReps: [6, 6, 6], reason: '이번엔 목표에 못 미쳤어요 → 같은 무게로 재도전',
    })
  })
  it('2회 연속 첫 세트 미달 → 10% 낮춰 증량 단위로 내림', () => {
    const h = [
      log('2026-10-08', sets(bench.id, [[62.5, 4]])),
      log('2026-10-10', sets(bench.id, [[62.5, 5], [62.5, 4]])),
    ]
    // 62.5 × 0.9 = 56.25 → 2.5 단위 내림 = 55
    expect(prescribe(h, slot(), bench)).toEqual({
      weightKg: 55, targetReps: [6, 6, 6], reason: '2회 연속 목표 미달 → 10% 낮춰 다시 쌓아가요',
    })
  })
  it('10% 내림: 정확히 나누어떨어지면 그대로, 하체는 5 단위', () => {
    const h = [
      log('2026-10-08', sets(squat.id, [[100, 3]])),
      log('2026-10-10', sets(squat.id, [[100, 3]])),
    ]
    expect(prescribe(h, slot({ exerciseId: squat.id }), squat).weightKg).toBe(90)
    const h2 = [
      log('2026-10-08', sets(squat.id, [[105, 3]])),
      log('2026-10-10', sets(squat.id, [[105, 3]])),
    ]
    // 94.5 → 90
    expect(prescribe(h2, slot({ exerciseId: squat.id }), squat).weightKg).toBe(90)
  })
  it('10% 내림은 증량 단위 1칸 아래로 내려가지 않는다', () => {
    const h = [
      log('2026-10-08', sets(bench.id, [[2.5, 3]])),
      log('2026-10-10', sets(bench.id, [[2.5, 3]])),
    ]
    expect(prescribe(h, slot(), bench).weightKg).toBe(2.5)
    const h2 = [
      log('2026-10-08', sets(squat.id, [[5, 3]])),
      log('2026-10-10', sets(squat.id, [[5, 3]])),
    ]
    expect(prescribe(h2, slot({ exerciseId: squat.id }), squat).weightKg).toBe(5)
  })
  it('기록 순서와 관계없이 가장 최근 수행일과 그 직전 수행일을 쓴다', () => {
    const h = [
      log('2026-10-10', sets(bench.id, [[62.5, 5]])),
      log('2026-10-01', sets(bench.id, [[62.5, 3]])),
      log('2026-10-08', sets(bench.id, [[60, 10]])),
      log('2026-10-09', sets('cable-fly', [[20, 3]])),
    ]
    expect(prescribe(h, slot(), bench).reason).toBe('이번엔 목표에 못 미쳤어요 → 같은 무게로 재도전')
  })
  it('그 전 수행일은 체크된 세트가 있는 날만 센다', () => {
    const h = [
      log('2026-10-08', sets(bench.id, [[62.5, 4]])),
      log('2026-10-09', sets(bench.id, [[62.5, 2, false]])),
      log('2026-10-10', sets(bench.id, [[62.5, 5]])),
    ]
    expect(prescribe(h, slot(), bench).weightKg).toBe(55)
  })
  it('기준 무게는 직전 수행일 첫 체크 세트', () => {
    const h = [log('2026-10-10', sets(bench.id, [[50, 10, false], [60, 9], [65, 8]]))]
    expect(prescribe(h, slot(), bench).weightKg).toBe(60)
  })
  it('before 옵션: 그 날짜 이후(포함) 기록은 무시', () => {
    const h = [
      log('2026-10-10', sets(bench.id, [[60, 9]])),
      log('2026-10-14', sets(bench.id, [[60, 10]])),
    ]
    expect(prescribe(h, slot({ sets: 1 }), bench, { before: '2026-10-14' }).targetReps).toEqual([10])
    expect(prescribe(h, slot({ sets: 1 }), bench).weightKg).toBe(62.5)
  })
  it('무게 없이(맨몸) 기록된 종목은 무게 null 유지', () => {
    const hlr = getExercise('hanging-leg-raise')!
    const h = [log('2026-10-10', sets(hlr.id, [[null, 15], [null, 15]]))]
    const r = prescribe(h, slot({ pattern: 'core', type: 'isolation', repMin: 10, repMax: 15, exerciseId: hlr.id }), hlr)
    expect(r.weightKg).toBeNull()
    expect(r.targetReps).toEqual([15, 15, 15])
  })
})

describe('e1rm', () => {
  it('Epley, 소수 1자리', () => {
    expect(e1rm(100, 5)).toBe(116.7)
    expect(e1rm(60, 10)).toBe(80)
    expect(e1rm(62.5, 8)).toBe(79.2)
    expect(e1rm(100, 0)).toBe(100)
  })
})
