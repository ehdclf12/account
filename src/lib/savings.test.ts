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
  it('도달 전에는 100%가 되지 않는다(내림)', () => {
    expect(goalProgress(10_000_000, 9_999_999)).toEqual({ pct: 99, remaining: 1 })
  })
  it('음수 진행은 0%로 하한 처리', () => {
    expect(goalProgress(1000, -500)).toEqual({ pct: 0, remaining: 1500 })
  })
})

describe('monthsUntil', () => {
  const now = { year: 2026, month: 7 }
  it('분기 기한(2027 3분기 = 9월), 이번 달 포함', () => {
    // 2026-07 ~ 2027-09 = 15개월(양끝 포함)
    expect(monthsUntil(2027, 3, now)).toBe(15)
  })
  it('연도 기한(2027 = 12월), 이번 달 포함', () => {
    expect(monthsUntil(2027, null, now)).toBe(18)
  })
  it('이미 지난 기한은 최소 1', () => {
    expect(monthsUntil(2026, 1, now)).toBe(1)
  })
  it('기한이 이번 달이면 1', () => {
    expect(monthsUntil(2026, 3, { year: 2026, month: 9 })).toBe(1)
  })
  it('기한이 다음 달이면 2', () => {
    expect(monthsUntil(2026, 4, { year: 2026, month: 11 })).toBe(2)
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
    expect(monthlyNeeded(1500, 2027, 3, now)).toBe(100) // 15개월
  })
  it('마감이 임박해도 이번 달을 포함해 계산', () => {
    // 2026-10 기준 4분기(12월) 마감 = 10·11·12 3개월
    expect(monthlyNeeded(3_000_000, 2026, 4, { year: 2026, month: 10 })).toBe(1_000_000)
  })
})
