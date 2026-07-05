import { describe, it, expect } from 'vitest'
import { monthKey, inMonth, formatDayHeader, nextMonthFirst } from './date'

describe('date utils', () => {
  it('monthKey는 2자리 월', () => {
    expect(monthKey(2026, 7)).toBe('2026-07')
    expect(monthKey(2026, 12)).toBe('2026-12')
  })
  it('inMonth', () => {
    expect(inMonth('2026-07-05', 2026, 7)).toBe(true)
    expect(inMonth('2026-08-01', 2026, 7)).toBe(false)
  })
  it('formatDayHeader', () => {
    expect(formatDayHeader('2026-07-05')).toBe('7월 5일 (일)')
  })
  it('nextMonthFirst', () => {
    expect(nextMonthFirst(2026, 2)).toBe('2026-03-01')
    expect(nextMonthFirst(2026, 12)).toBe('2027-01-01')
  })
})
