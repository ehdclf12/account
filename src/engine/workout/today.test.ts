import { describe, it, expect } from 'vitest'
import { findSession, todaySession, thisWeekLogs, sessionStatus, upsertSet } from './today'
import type { Program, Session, WorkoutLog, SetEntry } from './types'

const slot = (id: string, sets: number) => ({
  id, pattern: 'squat' as const, type: 'compound' as const, role: 'main' as const,
  sets, repMin: 5, repMax: 8, exerciseId: id, reason: '',
})
const legs: Session = { id: 'legs', name: '하체', kind: 'legs', slots: [slot('sq', 2), slot('rdl', 1)], reason: '' }
const rec: Session = { id: 'rec', name: '회복', kind: 'recovery', slots: [], reason: '' }
// 2026-10-14 = 수요일(index 2)
const program: Program = {
  weekSchedule: ['legs', null, 'legs', null, null, null, 'rec'], sessions: [legs, rec], seed: 1,
}
const e = (exerciseId: string, setIndex: number, done = true, reps = 5): SetEntry =>
  ({ exerciseId, setIndex, weightKg: 60, reps, done })
const log = (date: string, sessionId: string, sets: SetEntry[] = []): WorkoutLog => ({ date, sessionId, sets })

describe('todaySession', () => {
  it('uses weekSchedule when no log', () => {
    expect(todaySession(program, [], '2026-10-14')).toBe('legs')
    expect(todaySession(program, [], '2026-10-15')).toBeNull()
  })
  it("prefers today's log session (오늘만 바꾸기)", () => {
    expect(todaySession(program, [log('2026-10-14', 'rec')], '2026-10-14')).toBe('rec')
  })
  it('ignores other days logs', () => {
    expect(todaySession(program, [log('2026-10-13', 'rec')], '2026-10-14')).toBe('legs')
  })
})

describe('findSession', () => {
  it('finds sessions and tolerates ids missing from the program', () => {
    expect(findSession(program, 'legs')).toBe(legs)
    expect(findSession(program, 'gone')).toBeUndefined()
    expect(findSession(program, null)).toBeUndefined()
    const logs = [log('2026-10-14', 'gone')]
    expect(findSession(program, todaySession(program, logs, '2026-10-14'))).toBeUndefined()
  })
})

describe('thisWeekLogs', () => {
  it('returns Monday..Sunday only', () => {
    const logs = [
      log('2026-10-11', 'a'), log('2026-10-12', 'b'), log('2026-10-14', 'c'),
      log('2026-10-18', 'd'), log('2026-10-19', 'e'),
    ]
    expect(thisWeekLogs(logs, '2026-10-14').map((l) => l.sessionId)).toEqual(['b', 'c', 'd'])
    expect(thisWeekLogs(logs, '2026-10-18').map((l) => l.sessionId)).toEqual(['b', 'c', 'd'])
    expect(thisWeekLogs(logs, '2026-10-12').map((l) => l.sessionId)).toEqual(['b', 'c', 'd'])
  })
  it('handles month/year boundaries', () => {
    const logs = [log('2026-12-28', 'a'), log('2027-01-03', 'b'), log('2027-01-04', 'c')]
    expect(thisWeekLogs(logs, '2027-01-01').map((l) => l.sessionId)).toEqual(['a', 'b'])
  })
})

describe('sessionStatus', () => {
  it('todo with no log or no done sets', () => {
    expect(sessionStatus(undefined, legs)).toBe('todo')
    expect(sessionStatus(log('d', 'legs', [e('sq', 0, false)]), legs)).toBe('todo')
  })
  it('in_progress when some done', () => {
    expect(sessionStatus(log('d', 'legs', [e('sq', 0)]), legs)).toBe('in_progress')
  })
  it('done when all slot sets done', () => {
    expect(sessionStatus(log('d', 'legs', [e('sq', 0), e('sq', 1), e('rdl', 0)]), legs)).toBe('done')
  })
  it('does not double count duplicate entries', () => {
    expect(sessionStatus(log('d', 'legs', [e('sq', 0), e('sq', 0), e('sq', 1)]), legs)).toBe('in_progress')
  })
  it('ignores stale/foreign entries not in the session slots', () => {
    expect(sessionStatus(log('d', 'legs', [e('other', 0), e('sq', 5)]), legs)).toBe('todo')
    expect(sessionStatus(log('d', 'legs', [e('other', 0), e('sq', 0)]), legs)).toBe('in_progress')
    expect(sessionStatus(log('d', 'legs', [e('sq', 0), e('sq', 1), e('rdl', 0), e('other', 0)]), legs)).toBe('done')
  })
  it('recovery: done iff recovery marker done (other entries ignored)', () => {
    expect(sessionStatus(undefined, rec)).toBe('todo')
    expect(sessionStatus(log('d', 'rec', []), rec)).toBe('todo')
    expect(sessionStatus(log('d', 'rec', [e('recovery', 0)]), rec)).toBe('done')
    expect(sessionStatus(log('d', 'rec', [e('recovery', 0, false)]), rec)).toBe('todo')
    expect(sessionStatus(log('d', 'rec', [e('sq', 0)]), rec)).toBe('todo')
  })
})

describe('upsertSet', () => {
  it('creates a log when none', () => {
    expect(upsertSet(undefined, '2026-10-14', 'legs', e('sq', 0))).toEqual(log('2026-10-14', 'legs', [e('sq', 0)]))
  })
  it('replaces by exerciseId+setIndex immutably', () => {
    const orig = log('2026-10-14', 'legs', [e('sq', 0, false), e('sq', 1)])
    const snap = JSON.stringify(orig)
    const next = upsertSet(orig, '2026-10-14', 'legs', e('sq', 0, true, 8))
    expect(next.sets).toEqual([e('sq', 0, true, 8), e('sq', 1)])
    expect(JSON.stringify(orig)).toBe(snap)
    expect(next).not.toBe(orig)
  })
  it('appends new set and keeps id', () => {
    const orig = { ...log('2026-10-14', 'legs', [e('sq', 0)]), id: 'x' }
    const next = upsertSet(orig, '2026-10-14', 'legs', e('rdl', 0))
    expect(next.id).toBe('x')
    expect(next.sets).toHaveLength(2)
  })
})
