import { describe, it, expect } from 'vitest'
import { checkSchedule, swapDays, intervalTexts, sessionsOverlap, weekdayIndex, isWorkedDay } from './schedule'
import { generateProgram, DEFAULT_SEED } from './generate'
import type { Program, WorkoutLog } from './types'

const six = (): Program => generateProgram({ daysPerWeek: 6, timeBudgetMin: 70 }, DEFAULT_SEED)
const sess = (p: Program, id: string) => p.sessions.find((s) => s.id === id)!
// 2026-10-12 = 월요일
const DATES = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']
const log = (day: number, sessionId: string, doneSets: number, exerciseId = 'x'): WorkoutLog => ({
  date: DATES[day], sessionId,
  sets: [
    ...Array.from({ length: doneSets }, (_, i) => ({ exerciseId, setIndex: i, weightKg: 40, reps: 8, done: true })),
    { exerciseId, setIndex: doneSets, weightKg: 40, reps: 8, done: false },
  ],
})

describe('부위 겹침', () => {
  it('부위 그룹이 하나라도 겹치면 같은 부위', () => {
    const p = generateProgram({ daysPerWeek: 5, timeBudgetMin: 70 }, 1)
    expect(sessionsOverlap(sess(p, 'shoulder'), sess(p, 'upper'))).toBe(true)
    expect(sessionsOverlap(sess(p, 'back'), sess(p, 'upper'))).toBe(true)
    expect(sessionsOverlap(sess(p, 'shoulder'), sess(p, 'back'))).toBe(false)
    expect(sessionsOverlap(sess(p, 'legs-a'), sess(p, 'upper'))).toBe(false)
    expect(sessionsOverlap(sess(p, 'recovery'), sess(p, 'recovery'))).toBe(false)
    const q = generateProgram({ daysPerWeek: 3, timeBudgetMin: 70 }, 1)
    expect(sessionsOverlap(sess(q, 'full-a'), sess(p, 'legs-b'))).toBe(true)
  })
})

describe('weekdayIndex / isWorkedDay', () => {
  it('월=0 … 일=6', () => {
    expect(DATES.map(weekdayIndex)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })
  it('체크된 세트 1개 이상이면 운동한 날, 회복은 기록만 있으면', () => {
    const p = six()
    expect(isWorkedDay(log(1, 'shoulder-a', 1), sess(p, 'shoulder-a'))).toBe(true)
    expect(isWorkedDay(log(1, 'shoulder-a', 0), sess(p, 'shoulder-a'))).toBe(false)
    expect(isWorkedDay({ date: DATES[0], sessionId: 'recovery', sets: [] }, sess(p, 'recovery'))).toBe(false)
    const mk = (done: boolean) => ({ date: DATES[0], sessionId: 'recovery', sets: [{ exerciseId: 'recovery', setIndex: 0, weightKg: null, reps: 0, done }] })
    expect(isWorkedDay(mk(true), sess(p, 'recovery'))).toBe(true)
    expect(isWorkedDay(mk(false), sess(p, 'recovery'))).toBe(false)
    expect(isWorkedDay(undefined, sess(p, 'recovery'))).toBe(false)
  })
})

describe('intervalTexts', () => {
  it('기록 없이 월요일: 주간 계획 기준 간격', () => {
    expect(intervalTexts(six(), [], 0)).toEqual([
      '', '이번 주 처음', '이번 주 처음', '이번 주 처음',
      '어깨 화요일 이후 72시간', '하체 수요일 이후 72시간', '등 목요일 이후 72시간',
    ])
  })
  it('지난 요일은 체크된 세트가 있어야 운동한 날', () => {
    const p = six()
    const logs = [log(1, 'shoulder-a', 0), log(2, 'legs-a', 2)]
    const t = intervalTexts(p, logs, 4)
    expect(t[4]).toBe('이번 주 처음')
    expect(t[5]).toBe('하체 수요일 이후 72시간')
    // 목요일은 기록 없이 지나감 → 등 B는 이번 주 처음
    expect(t[6]).toBe('이번 주 처음')
  })
  it('오늘만 바꾸기: 기록의 sessionId를 따른다', () => {
    const p = six()
    // 수요일에 하체 A 대신 어깨 B를 함
    const logs = [log(1, 'shoulder-a', 3), log(2, 'shoulder-b', 1)]
    const t = intervalTexts(p, logs, 3)
    expect(t[2]).toBe('어깨 화요일 이후 24시간')
    expect(t[4]).toBe('어깨 수요일 이후 48시간')
    expect(t[5]).toBe('이번 주 처음')
  })
  it('겹치는 다른 종류 세션 이름으로 표시(상체 ← 등)', () => {
    const p = generateProgram({ daysPerWeek: 5, timeBudgetMin: 70 }, 1)
    const t = intervalTexts(p, [], 0)
    expect(t).toEqual(['이번 주 처음', '이번 주 처음', '이번 주 처음', '', '등 수요일 이후 48시간', '하체 화요일 이후 96시간', ''])
  })
})

describe('checkSchedule', () => {
  it('같은 부위 48시간 미만이면 위반', () => {
    const p = six()
    const ws = [...p.weekSchedule]
    ;[ws[3], ws[4]] = [ws[4], ws[3]] // 어깨 B 목, 등 A 금 → 어깨 A 화 · 어깨 B 목 OK, 등 A 금 · 등 B 일 OK
    expect(checkSchedule(ws, p.sessions)).toEqual([])
    const bad = ['recovery', 'shoulder-a', 'shoulder-b', 'legs-a', 'back-a', 'legs-b', 'back-b']
    const v = checkSchedule(bad, p.sessions)
    expect(v).toHaveLength(1)
    expect(v[0].kind).toBe('interval')
    expect(v[0].days).toEqual([1, 2])
    expect(v[0].message).toBe('어깨 A(화)와 어깨 B(수) 사이가 24시간이에요 — 같은 부위는 48시간 이상 필요해요')
  })
  it('받침 있는 이름 뒤에는 과', () => {
    const p = generateProgram({ daysPerWeek: 5, timeBudgetMin: 70 }, 1)
    const v = checkSchedule(['shoulder', 'legs-a', 'recovery', 'back', 'upper', 'legs-b', null], p.sessions)
    expect(v.map((x) => x.message)).toEqual(['등(목)과 상체(금) 사이가 24시간이에요 — 같은 부위는 48시간 이상 필요해요'])
  })
  it('주를 넘어 순환 계산(일 → 월)', () => {
    const p = six()
    const ws = ['back-a', 'recovery', 'shoulder-a', 'legs-a', 'shoulder-b', 'legs-b', 'back-b']
    const v = checkSchedule(ws, p.sessions)
    expect(v.map((x) => x.days)).toEqual([[0, 6]])
    expect(v[0].message).toContain('24시간')
  })
  it('회복·휴식일이 없으면 위반', () => {
    const p = six()
    const ws = ['shoulder-a', 'legs-a', 'back-a', 'shoulder-b', 'legs-b', 'back-b', 'legs-a']
    const v = checkSchedule(ws, p.sessions)
    expect(v.some((x) => x.kind === 'rest')).toBe(true)
    expect(v.find((x) => x.kind === 'rest')!.message).toBe('회복·휴식일이 하루 이상 있어야 해요')
  })
})

describe('swapDays', () => {
  it('규칙을 지키면 위반 없이 바꾼다(원본 불변)', () => {
    const p = six()
    const r = swapDays(p, 1, 2)
    expect(r.program.weekSchedule).toEqual(['recovery', 'legs-a', 'shoulder-a', 'back-a', 'shoulder-b', 'legs-b', 'back-b'])
    expect(r.violations).toEqual([])
    expect(p.weekSchedule[1]).toBe('shoulder-a')
  })
  it('위반이면 위반 목록과 대안 요일', () => {
    const p = six()
    const r = swapDays(p, 1, 3)
    expect(r.program.weekSchedule[3]).toBe('shoulder-a')
    expect(r.violations.map((v) => v.days)).toEqual([[3, 4]])
    expect(r.alternatives).toEqual([0, 2, 4, 6])
  })
  it('대안에는 자기 자신과 같은 세션 요일이 없다', () => {
    const p = generateProgram({ daysPerWeek: 3, timeBudgetMin: 70 }, 1)
    const r = swapDays(p, 0, 1)
    expect(r.alternatives).not.toContain(0)
    expect(r.alternatives).not.toContain(4)
  })
})
