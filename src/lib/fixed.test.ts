import { describe, it, expect } from 'vitest'
import { fixedCostDate } from './fixed'

describe('fixedCostDate', () => {
  it('해당 월 날짜 문자열, 말일 초과 시 말일로 보정', () => {
    expect(fixedCostDate(2026, 7, 15)).toBe('2026-07-15')
    expect(fixedCostDate(2026, 2, 31)).toBe('2026-02-28') // 2026 평년
    expect(fixedCostDate(2026, 7, 5)).toBe('2026-07-05')
  })
  it('윤년 2월 말일 보정', () => {
    expect(fixedCostDate(2028, 2, 31)).toBe('2028-02-29')
  })
  it('12월도 정상 처리', () => {
    expect(fixedCostDate(2026, 12, 31)).toBe('2026-12-31')
  })
  it('0 이하의 날짜는 1일로 보정(깨진 날짜 문자열 방지)', () => {
    expect(fixedCostDate(2026, 7, 0)).toBe('2026-07-01')
    expect(fixedCostDate(2026, 7, -3)).toBe('2026-07-01')
  })
})
