import { describe, it, expect } from 'vitest'
import { parseDateParam, parseItemParam, archiveItemHref, calendarDateHref } from './deeplink'

describe('parseDateParam', () => {
  it('정상 날짜는 그대로', () => {
    expect(parseDateParam('2026-10-16')).toBe('2026-10-16')
  })
  it('null·빈 값은 null', () => {
    expect(parseDateParam(null)).toBeNull()
    expect(parseDateParam('')).toBeNull()
  })
  it('형식이 틀리면 null', () => {
    expect(parseDateParam('abc')).toBeNull()
    expect(parseDateParam('2026-1-5')).toBeNull()
    expect(parseDateParam('2026-10-16T00:00')).toBeNull()
  })
  it('달력에 없는 날짜는 null — Date가 13월을 다음 해 1월로 넘겨버리는 것을 막는다', () => {
    expect(parseDateParam('2026-13-01')).toBeNull()
    expect(parseDateParam('2026-02-30')).toBeNull()
  })
})

describe('parseItemParam', () => {
  it('uuid는 그대로', () => {
    const id = '3f2b8c1e-1a2b-4c3d-9e8f-0a1b2c3d4e5f'
    expect(parseItemParam(id)).toBe(id)
  })
  it('앞뒤 공백은 제거', () => {
    expect(parseItemParam('  abc-1  ')).toBe('abc-1')
  })
  it('null·빈 값·이상한 문자는 null', () => {
    expect(parseItemParam(null)).toBeNull()
    expect(parseItemParam('   ')).toBeNull()
    expect(parseItemParam('a b')).toBeNull()
    expect(parseItemParam('<script>')).toBeNull()
    expect(parseItemParam('x'.repeat(65))).toBeNull()
  })
})

describe('href 만들기', () => {
  it('archiveItemHref', () => {
    expect(archiveItemHref('abc-1')).toBe('/archive?item=abc-1')
  })
  it('calendarDateHref', () => {
    expect(calendarDateHref('2026-10-16')).toBe('/calendar?date=2026-10-16')
  })
})
