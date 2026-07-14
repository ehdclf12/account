import { describe, it, expect } from 'vitest'
import { monthGrid, shiftMonth, calendarItems, groupByDue, isAllDone } from './calendar'
import type { ArchiveItem } from '@/types'

const item = (over: Partial<ArchiveItem>): ArchiveItem =>
  ({ id: '', folder_id: null, kind: 'checklist', title: '', body: null, url: null,
     preview: null, checklist: null, pinned: false, due_date: null, color: null,
     archived: false, created_at: '', updated_at: '', ...over })

describe('monthGrid', () => {
  it('항상 42칸(6주)을 낸다', () => {
    expect(monthGrid(2026, 7)).toHaveLength(42)
    expect(monthGrid(2026, 2)).toHaveLength(42)
  })
  it('월요일로 시작한다 — 2026-07-01은 수요일이라 앞에 6/29(월), 6/30(화)이 온다', () => {
    const g = monthGrid(2026, 7)
    expect(g[0]).toEqual({ iso: '2026-06-29', day: 29, inMonth: false })
    expect(g[1]).toEqual({ iso: '2026-06-30', day: 30, inMonth: false })
    expect(g[2]).toEqual({ iso: '2026-07-01', day: 1, inMonth: true })
  })
  it('1일이 월요일이면 앞을 채우지 않는다 — 2026-06-01은 월요일', () => {
    const g = monthGrid(2026, 6)
    expect(g[0]).toEqual({ iso: '2026-06-01', day: 1, inMonth: true })
  })
  it('마지막 칸은 다음 달로 넘어간다', () => {
    const g = monthGrid(2026, 7)
    expect(g[41].inMonth).toBe(false)
    expect(g[41].iso).toBe('2026-08-09')
  })
  it('월말 날짜의 inMonth가 true다', () => {
    const g = monthGrid(2026, 7)
    expect(g.find((c) => c.iso === '2026-07-31')?.inMonth).toBe(true)
  })
})

describe('shiftMonth', () => {
  it('앞으로 이동', () => {
    expect(shiftMonth(2026, 7, 1)).toEqual({ year: 2026, month: 8 })
  })
  it('12월에서 앞으로 가면 해가 바뀐다', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 })
  })
  it('1월에서 뒤로 가면 해가 바뀐다', () => {
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 })
  })
})

describe('calendarItems', () => {
  it('기한 있는 체크리스트만 남긴다', () => {
    const keep = item({ id: 'keep', kind: 'checklist', due_date: '2026-07-10' })
    const res = calendarItems([
      keep,
      item({ id: 'nodue', kind: 'checklist', due_date: null }),
      item({ id: 'archived', kind: 'checklist', due_date: '2026-07-10', archived: true }),
      item({ id: 'link', kind: 'link', due_date: '2026-07-10' }),
      item({ id: 'image', kind: 'image', due_date: '2026-07-10' }),
    ])
    expect(res.map((i) => i.id)).toEqual(['keep'])
  })
})

describe('groupByDue', () => {
  it('같은 날짜는 한 배열에 묶는다', () => {
    const g = groupByDue([
      item({ id: 'a', due_date: '2026-07-10' }),
      item({ id: 'b', due_date: '2026-07-10' }),
      item({ id: 'c', due_date: '2026-07-11' }),
    ])
    expect(g['2026-07-10'].map((i) => i.id)).toEqual(['a', 'b'])
    expect(g['2026-07-11'].map((i) => i.id)).toEqual(['c'])
  })
  it('없는 날짜는 키가 없다', () => {
    expect(groupByDue([])['2026-07-10']).toBeUndefined()
  })
})

describe('isAllDone', () => {
  it('전부 done이면 true', () => {
    expect(isAllDone(item({ checklist: [{ text: 'a', done: true }] }))).toBe(true)
  })
  it('하나라도 남으면 false', () => {
    expect(isAllDone(item({ checklist: [{ text: 'a', done: true }, { text: 'b', done: false }] }))).toBe(false)
  })
  it('빈 체크리스트는 false — true면 빈 카드가 전부 취소선으로 그어진다', () => {
    expect(isAllDone(item({ checklist: [] }))).toBe(false)
    expect(isAllDone(item({ checklist: null }))).toBe(false)
  })
})
