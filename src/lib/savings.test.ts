import { describe, it, expect } from 'vitest'
import { goalProgress, monthsUntil, monthlyNeeded } from './savings'

describe('goalProgress', () => {
  it('진행 중', () => {
    expect(goalProgress(1000, 400)).toEqual({ pct: 40, remaining: 600 })
  })
  it('초과 시 pct 100, remaining 0', () => {
    expect(goalProgress(1000, 1200)).toEqual({ pct: 100, remaining: 0 })
  })
  it('목표액 0이면 pct 0', () => {
    expect(goalProgress(0, 0)).toEqual({ pct: 0, remaining: 0 })
  })
})

describe('monthsUntil', () => {
  const now = { year: 2026, month: 7 }
  it('분기 기한(2027 3분기 = 9월)', () => {
    expect(monthsUntil(2027, 3, now)).toBe(14)
  })
  it('연도 기한(2027 = 12월)', () => {
    expect(monthsUntil(2027, null, now)).toBe(17)
  })
  it('이미 지난 기한은 최소 1', () => {
    expect(monthsUntil(2026, 1, now)).toBe(1)
  })
})

describe('monthlyNeeded', () => {
  const now = { year: 2026, month: 7 }
  it('기한 없으면 null', () => {
    expect(monthlyNeeded(600, null, null, now)).toBeNull()
  })
  it('이미 달성(remaining<=0)이면 null', () => {
    expect(monthlyNeeded(0, 2027, 3, now)).toBeNull()
  })
  it('정상: remaining/개월 올림', () => {
    expect(monthlyNeeded(1400, 2027, 3, now)).toBe(100)
  })
})
