import { describe, it, expect } from 'vitest'
import { elapsedSeconds, formatDuration, totalsByBlock, sumInRange, weekStartISO, dailyTotals, heatLevel } from './time'
import type { TimeSession } from '@/types'

const s = (over: Partial<TimeSession>): TimeSession => ({
  id: '', block_id: 'b1', who: 'husband',
  started_at: '2026-07-19T10:00:00+09:00', ended_at: null, created_at: '', ...over,
})
const at = (iso: string) => new Date(iso).getTime()

describe('elapsedSeconds', () => {
  it('종료된 세션은 시작~종료', () => {
    expect(elapsedSeconds(
      s({ started_at: '2026-07-19T10:00:00+09:00', ended_at: '2026-07-19T10:25:00+09:00' }),
      at('2026-07-19T23:00:00+09:00'),
    )).toBe(1500)
  })
  it('진행 중이면 now 기준', () => {
    expect(elapsedSeconds(
      s({ started_at: '2026-07-19T10:00:00+09:00', ended_at: null }),
      at('2026-07-19T10:00:30+09:00'),
    )).toBe(30)
  })
  it('시작이 미래인 이상값은 0', () => {
    expect(elapsedSeconds(
      s({ started_at: '2026-07-19T11:00:00+09:00', ended_at: null }),
      at('2026-07-19T10:00:00+09:00'),
    )).toBe(0)
  })
})

describe('formatDuration', () => {
  it('0은 0분', () => {
    expect(formatDuration(0)).toBe('0분')
  })
  it('1분 미만은 초', () => {
    expect(formatDuration(45)).toBe('45초')
  })
  it('1시간 미만은 분', () => {
    expect(formatDuration(1500)).toBe('25분')
  })
  it('1시간 이상은 시간+분', () => {
    expect(formatDuration(3600)).toBe('1시간')
    expect(formatDuration(5400)).toBe('1시간 30분')
  })
})

describe('totalsByBlock', () => {
  const now = at('2026-07-19T12:00:00+09:00')
  it('블럭별로 합산한다', () => {
    const list = [
      s({ block_id: 'a', started_at: '2026-07-19T10:00:00+09:00', ended_at: '2026-07-19T10:10:00+09:00' }),
      s({ block_id: 'a', started_at: '2026-07-19T11:00:00+09:00', ended_at: '2026-07-19T11:05:00+09:00' }),
      s({ block_id: 'b', started_at: '2026-07-19T11:30:00+09:00', ended_at: '2026-07-19T11:40:00+09:00' }),
    ]
    expect(totalsByBlock(list, now)).toEqual({ a: 900, b: 600 })
  })
  it('진행 중 세션도 포함한다', () => {
    const list = [s({ block_id: 'a', started_at: '2026-07-19T11:58:00+09:00', ended_at: null })]
    expect(totalsByBlock(list, now)).toEqual({ a: 120 })
  })
  it('빈 목록은 빈 객체', () => {
    expect(totalsByBlock([], now)).toEqual({})
  })
})

describe('weekStartISO (월요일 시작)', () => {
  it('수요일이면 그 주 월요일', () => {
    expect(weekStartISO('2026-07-22')).toBe('2026-07-20')
  })
  it('월요일이면 그대로', () => {
    expect(weekStartISO('2026-07-20')).toBe('2026-07-20')
  })
  it('일요일이면 그 주 월요일(6일 전)', () => {
    expect(weekStartISO('2026-07-26')).toBe('2026-07-20')
  })
})

describe('sumInRange', () => {
  const now = at('2026-07-19T23:00:00+09:00')
  it('시작일 기준으로 범위에 넣는다', () => {
    const list = [
      s({ started_at: '2026-07-19T10:00:00+09:00', ended_at: '2026-07-19T10:10:00+09:00' }),
      s({ started_at: '2026-07-18T10:00:00+09:00', ended_at: '2026-07-18T10:30:00+09:00' }),
    ]
    expect(sumInRange(list, '2026-07-19', '2026-07-20', now)).toBe(600)
  })
  it('자정을 넘긴 세션은 시작일에 몰아서 잡는다', () => {
    const list = [
      s({ started_at: '2026-07-19T23:30:00+09:00', ended_at: '2026-07-20T00:30:00+09:00' }),
    ]
    expect(sumInRange(list, '2026-07-19', '2026-07-20', now)).toBe(3600)
    expect(sumInRange(list, '2026-07-20', '2026-07-21', now)).toBe(0)
  })
  it('범위 밖은 0', () => {
    const list = [s({ started_at: '2026-07-01T10:00:00+09:00', ended_at: '2026-07-01T11:00:00+09:00' })]
    expect(sumInRange(list, '2026-07-19', '2026-07-20', now)).toBe(0)
  })
  it('주간 범위 합산', () => {
    const list = [
      s({ started_at: '2026-07-20T10:00:00+09:00', ended_at: '2026-07-20T11:00:00+09:00' }), // 월
      s({ started_at: '2026-07-26T10:00:00+09:00', ended_at: '2026-07-26T10:30:00+09:00' }), // 일
      s({ started_at: '2026-07-27T10:00:00+09:00', ended_at: '2026-07-27T10:30:00+09:00' }), // 다음 주 월
    ]
    expect(sumInRange(list, '2026-07-20', '2026-07-27', at('2026-07-27T12:00:00+09:00'))).toBe(5400)
  })
})

describe('dailyTotals', () => {
  const now = at('2026-07-19T23:00:00+09:00')
  it('날짜별로 합산한다(시작일 기준)', () => {
    const list = [
      s({ started_at: '2026-07-19T10:00:00+09:00', ended_at: '2026-07-19T10:10:00+09:00' }),
      s({ started_at: '2026-07-19T14:00:00+09:00', ended_at: '2026-07-19T14:20:00+09:00' }),
      s({ started_at: '2026-07-18T09:00:00+09:00', ended_at: '2026-07-18T09:30:00+09:00' }),
    ]
    expect(dailyTotals(list, now)).toEqual({ '2026-07-19': 1800, '2026-07-18': 1800 })
  })
  it('진행 중 세션도 포함', () => {
    const list = [s({ started_at: '2026-07-19T22:59:00+09:00', ended_at: null })]
    expect(dailyTotals(list, now)).toEqual({ '2026-07-19': 60 })
  })
  it('자정 넘긴 세션은 시작일에만 잡힌다', () => {
    const list = [s({ started_at: '2026-07-19T23:30:00+09:00', ended_at: '2026-07-20T00:30:00+09:00' })]
    expect(dailyTotals(list, at('2026-07-20T01:00:00+09:00'))).toEqual({ '2026-07-19': 3600 })
  })
  it('빈 목록은 빈 객체', () => {
    expect(dailyTotals([], now)).toEqual({})
  })
})

describe('heatLevel', () => {
  it('기록 없으면 0', () => {
    expect(heatLevel(0)).toBe(0)
  })
  it('30분 미만은 1', () => {
    expect(heatLevel(1)).toBe(1)
    expect(heatLevel(1799)).toBe(1)
  })
  it('30분~1시간은 2', () => {
    expect(heatLevel(1800)).toBe(2)
    expect(heatLevel(3599)).toBe(2)
  })
  it('1~2시간은 3', () => {
    expect(heatLevel(3600)).toBe(3)
    expect(heatLevel(7199)).toBe(3)
  })
  it('2시간 이상은 4', () => {
    expect(heatLevel(7200)).toBe(4)
    expect(heatLevel(36000)).toBe(4)
  })
})
