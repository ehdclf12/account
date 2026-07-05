import { describe, it, expect } from 'vitest'
import { fixedCostDate } from './fixed'

describe('fixedCostDate', () => {
  it('해당 월 날짜 문자열, 말일 초과 시 말일로 보정', () => {
    expect(fixedCostDate(2026, 7, 15)).toBe('2026-07-15')
    expect(fixedCostDate(2026, 2, 31)).toBe('2026-02-28') // 2026 평년
    expect(fixedCostDate(2026, 7, 5)).toBe('2026-07-05')
  })
})
