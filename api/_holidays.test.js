import { describe, it, expect } from 'vitest'
import { normalizeHolidays } from './_holidays.js'

const wrap = (item, resultCode = '00') => ({
  response: {
    header: { resultCode, resultMsg: 'NORMAL SERVICE.' },
    body: { items: item === null ? '' : { item }, totalCount: 0, numOfRows: 100 },
  },
})

describe('normalizeHolidays', () => {
  it('배열 응답을 ISO 맵으로 바꾼다', () => {
    // 실제 2026 응답에서 발췌: locdate는 문자열이 아니라 숫자
    expect(normalizeHolidays(wrap([
      { dateName: '1월1일', isHoliday: 'Y', locdate: 20260101 },
      { dateName: '삼일절', isHoliday: 'Y', locdate: 20260301 },
      { dateName: '대체공휴일(삼일절)', isHoliday: 'Y', locdate: 20260302 },
    ]))).toEqual({
      '2026-01-01': '1월1일',
      '2026-03-01': '삼일절',
      '2026-03-02': '대체공휴일(삼일절)',
    })
  })

  it('결과가 1건이면 단일 객체로 오는 경우도 처리', () => {
    expect(normalizeHolidays(wrap({ dateName: '한글날', isHoliday: 'Y', locdate: 20261009 })))
      .toEqual({ '2026-10-09': '한글날' })
  })

  it('isHoliday가 Y가 아니면 제외', () => {
    expect(normalizeHolidays(wrap([
      { dateName: '삼일절', isHoliday: 'Y', locdate: 20260301 },
      { dateName: '어떤날', isHoliday: 'N', locdate: 20260302 },
    ]))).toEqual({ '2026-03-01': '삼일절' })
  })

  it('두 자리 미만 월·일을 0으로 채운다', () => {
    expect(normalizeHolidays(wrap([{ dateName: '어린이날', isHoliday: 'Y', locdate: 20260505 }])))
      .toEqual({ '2026-05-05': '어린이날' })
  })

  it('같은 날 여러 건이면 마지막이 아니라 첫 이름을 남긴다', () => {
    expect(normalizeHolidays(wrap([
      { dateName: '추석', isHoliday: 'Y', locdate: 20260924 },
      { dateName: '중복항목', isHoliday: 'Y', locdate: 20260924 },
    ]))).toEqual({ '2026-09-24': '추석' })
  })

  it('빈 응답·깨진 구조는 빈 맵', () => {
    expect(normalizeHolidays(wrap(null))).toEqual({})
    expect(normalizeHolidays(wrap([]))).toEqual({})
    expect(normalizeHolidays({})).toEqual({})
    expect(normalizeHolidays(null)).toEqual({})
    expect(normalizeHolidays(undefined)).toEqual({})
    expect(normalizeHolidays('<html>error</html>')).toEqual({})
  })

  it('resultCode가 정상이 아니면 빈 맵', () => {
    expect(normalizeHolidays(wrap([
      { dateName: '삼일절', isHoliday: 'Y', locdate: 20260301 },
    ], '30'))).toEqual({})
  })

  it('locdate가 이상하면 그 항목만 건너뛴다', () => {
    expect(normalizeHolidays(wrap([
      { dateName: '정상', isHoliday: 'Y', locdate: 20260301 },
      { dateName: '깨짐', isHoliday: 'Y', locdate: 123 },
      { dateName: '없음', isHoliday: 'Y' },
    ]))).toEqual({ '2026-03-01': '정상' })
  })
})
