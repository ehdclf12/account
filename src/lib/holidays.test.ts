import { describe, it, expect } from 'vitest'
import { weekdayTone, holidayName } from './holidays'

// 2026-03-01(삼일절)은 일요일, 03-02(대체공휴일)은 월요일
const map = { '2026-03-01': '삼일절', '2026-03-02': '대체공휴일(삼일절)' }

describe('weekdayTone', () => {
  it('평일은 normal', () => {
    expect(weekdayTone('2026-03-05', {})).toBe('normal') // 목
  })
  it('토요일은 blue', () => {
    expect(weekdayTone('2026-03-07', {})).toBe('blue')
  })
  it('일요일은 red', () => {
    expect(weekdayTone('2026-03-08', {})).toBe('red')
  })
  it('평일에 온 공휴일은 red', () => {
    expect(weekdayTone('2026-03-02', map)).toBe('red') // 월요일 대체공휴일
  })
  it('토요일에 공휴일이 겹치면 공휴일이 우선해 red', () => {
    expect(weekdayTone('2026-03-07', { '2026-03-07': '가상공휴일' })).toBe('red')
  })
  it('공휴일 맵이 비어도 요일 규칙은 그대로', () => {
    expect(weekdayTone('2026-03-01', {})).toBe('red') // 일요일
  })
})

describe('holidayName', () => {
  it('공휴일이면 이름', () => {
    expect(holidayName('2026-03-01', map)).toBe('삼일절')
  })
  it('아니면 null', () => {
    expect(holidayName('2026-03-05', map)).toBeNull()
    expect(holidayName('2026-03-05', {})).toBeNull()
  })
})
