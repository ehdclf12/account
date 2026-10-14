import { describe, it, expect } from 'vitest'
import type { ArchiveItem, TimeBlock, TimeGoal, TimeSession } from '@/types'
import {
  buildDashboard, shortLabel, urgencyFor, dDayText, addDays, formatClock, LIMITS,
  type DashboardInput,
} from './dashboard'

const TODAY = '2026-10-14'
const NOW = new Date('2026-10-14T12:00:00').getTime()

let seq = 0
function item(p: Partial<ArchiveItem> = {}): ArchiveItem {
  seq += 1
  return {
    id: `i${seq}`, folder_id: null, kind: 'checklist', title: `항목${seq}`, body: null, url: null,
    preview: null, checklist: [{ text: 'a', done: false }], pinned: false, due_date: null,
    color: null, archived: false, done: false,
    created_at: '2026-10-01T00:00:00', updated_at: '2026-10-01T00:00:00', ...p,
  }
}
function session(p: Partial<TimeSession> = {}): TimeSession {
  seq += 1
  return {
    id: `s${seq}`, block_id: 'b1', who: 'husband',
    started_at: '2026-10-14T09:00:00', ended_at: '2026-10-14T10:00:00',
    created_at: '2026-10-14T09:00:00', ...p,
  }
}
function block(p: Partial<TimeBlock> = {}): TimeBlock {
  return {
    id: 'b1', who: 'husband', name: '공부', icon: 'book', color: null, group_id: null,
    sort_order: 0, archived: false, created_at: '', ...p,
  }
}
function goal(p: Partial<TimeGoal> = {}): TimeGoal {
  return {
    id: 'g1', who: 'husband', title: '독서', sort_order: 0, created_at: '',
    checklist: [{ text: 'a', done: true }, { text: 'b', done: false }], ...p,
  }
}
function input(p: Partial<DashboardInput> = {}): DashboardInput {
  return { items: [], sessions: [], blocks: [], goals: [], holidays: {}, todayISO: TODAY, nowMs: NOW, ...p }
}

describe('작은 도우미', () => {
  it('shortLabel: 8자 이하는 그대로, 넘치면 …포함 8자', () => {
    expect(shortLabel('세금신고')).toBe('세금신고')
    expect(shortLabel('가나다라마바사아자')).toBe('가나다라마바사…')
    expect(shortLabel('  보고서  ')).toBe('보고서')
  })
  it('urgencyFor 경계', () => {
    expect(urgencyFor(-1)).toBe('hot')
    expect(urgencyFor(0)).toBe('hot')
    expect(urgencyFor(1)).toBe('near')
    expect(urgencyFor(2)).toBe('near')
    expect(urgencyFor(3)).toBe('far')
    expect(urgencyFor(7)).toBe('far')
  })
  it('dDayText', () => {
    expect(dDayText(-1)).toBe('D+1')
    expect(dDayText(0)).toBe('D-DAY')
    expect(dDayText(2)).toBe('D-2')
  })
  it('addDays는 월말을 넘긴다', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02')
    expect(addDays('2026-10-14', -14)).toBe('2026-09-30')
  })
  it('formatClock', () => {
    expect(formatClock(new Date(2026, 9, 14, 21, 7).getTime())).toBe('10.14 WED · 21:07')
  })
})

describe('Deadline', () => {
  it('지난 것~7일 이내 미완료 체크리스트만, 기한 순', () => {
    const d = buildDashboard(input({ items: [
      item({ id: 'far', due_date: '2026-10-21', title: '여권' }),        // D-7 포함
      item({ id: 'over', due_date: '2026-10-13', title: '세금신고' }),   // D+1
      item({ id: 'out', due_date: '2026-10-22' }),                       // D-8 제외
      item({ id: 'today', due_date: '2026-10-14', title: '보고서' }),
    ] }))
    expect(d.deadline.nodes.map((n) => n.id)).toEqual(['dl-over', 'dl-today', 'dl-far'])
    expect(d.deadline.nodes.map((n) => n.sub)).toEqual(['D+1', 'D-DAY', 'D-7'])
    expect(d.deadline.nodes[0]).toMatchObject({
      label: '세금신고', urgency: 'hot', href: '/archive?item=over', dueISO: '2026-10-13', domain: 'deadline',
    })
  })
  it('완료·보관·기한 없음·체크리스트 아닌 것은 뺀다', () => {
    const d = buildDashboard(input({ items: [
      item({ due_date: TODAY, checklist: [{ text: 'a', done: true }] }), // 하위 전부 완료
      item({ due_date: TODAY, done: true }),                              // 카드 완료
      item({ due_date: TODAY, archived: true }),
      item({ due_date: null }),
      item({ due_date: TODAY, kind: 'link' }),
    ] }))
    expect(d.deadline.nodes).toEqual([])
  })
  it('최대 5개, 나머지는 overflow', () => {
    const items = Array.from({ length: 7 }, () => item({ due_date: TODAY }))
    const d = buildDashboard(input({ items }))
    expect(d.deadline.nodes).toHaveLength(LIMITS.deadline)
    expect(d.deadline.overflow).toBe(2)
  })
  it('같은 날 기한끼리 이웃 쌍으로 잇는다', () => {
    const d = buildDashboard(input({ items: [
      // 같은 날 안에서는 제목 순이므로 제목을 고정한다('항목9' vs '항목10' 같은 사전순 함정 방지)
      item({ id: 'a', due_date: '2026-10-16', title: '가' }),
      item({ id: 'b', due_date: '2026-10-16', title: '나' }),
      item({ id: 'c', due_date: '2026-10-17', title: '다' }),
    ] }))
    expect(d.sameDay).toEqual([['dl-a', 'dl-b']])
  })
})

describe('Calendar', () => {
  it('14일 안에서 공휴일이나 기한이 있는 날짜만, 날짜 순, 최대 3', () => {
    const d = buildDashboard(input({
      items: [
        item({ due_date: '2026-10-16' }), item({ due_date: '2026-10-16' }),
        item({ due_date: '2026-10-29' }), // +15 제외
      ],
      holidays: { '2026-10-15': '테스트휴일', '2026-10-20': '휴일2', '2026-10-25': '휴일3' },
    }))
    expect(d.calendar.nodes.map((n) => [n.label, n.sub])).toEqual([
      ['10/15', '테스트휴일'], ['10/16', '2건'], ['10/20', '휴일2'],
    ])
    expect(d.calendar.overflow).toBe(1)
    expect(d.calendar.nodes[1]).toMatchObject({
      id: 'cal-2026-10-16', href: '/calendar?date=2026-10-16', urgency: 'near',
    })
  })
  it('공휴일과 기한이 같은 날이면 함께 적는다', () => {
    const d = buildDashboard(input({ items: [item({ due_date: TODAY })], holidays: { [TODAY]: '휴일' } }))
    expect(d.calendar.nodes[0]).toMatchObject({ sub: '휴일 · 1건', urgency: 'hot' })
  })
  it('공휴일만 있는 날은 빨갛게 깜빡이지 않는다 (오늘이어도 near, 3일 뒤부터 far)', () => {
    const d = buildDashboard(input({ holidays: { [TODAY]: '휴일', '2026-10-16': '휴일2', '2026-10-17': '휴일3' } }))
    expect(d.calendar.nodes.map((n) => n.urgency)).toEqual(['near', 'near', 'far'])
  })
  it('긴 공휴일 이름은 8글자로 줄인다', () => {
    const d = buildDashboard(input({ items: [item({ due_date: TODAY })], holidays: { [TODAY]: '아주아주긴공휴일이름' } }))
    expect(d.calendar.nodes[0].sub).toBe('아주아주긴공휴… · 1건')
  })
})

describe('Time', () => {
  it('진행 중 → 오늘 누적 상위 블럭 → 남은 목표 순', () => {
    const d = buildDashboard(input({
      blocks: [block({ id: 'b1', name: '공부' }), block({ id: 'b2', name: '운동' }), block({ id: 'b3', name: '독서' })],
      sessions: [
        session({ id: 'run', block_id: 'b1', started_at: '2026-10-14T11:18:00', ended_at: null }),
        session({ block_id: 'b1' }),                                                        // 진행 중 블럭이라 상위 목록에선 제외
        session({ block_id: 'b2', started_at: '2026-10-14T06:00:00', ended_at: '2026-10-14T06:30:00' }),
        session({ block_id: 'b3', started_at: '2026-10-14T07:00:00', ended_at: '2026-10-14T08:00:00' }),
        session({ block_id: 'b2', started_at: '2026-10-13T06:00:00', ended_at: '2026-10-13T09:00:00' }), // 어제
      ],
      goals: [goal({ id: 'g1', title: '독서 목표' }), goal({ id: 'g2', checklist: [{ text: 'x', done: true }] })],
    }))
    expect(d.time.nodes.map((n) => [n.id, n.label, n.sub, n.urgency])).toEqual([
      ['run-run', '● 공부', '42분', 'live'],
      ['blk-b3', '독서', '1시간', 'calm'],
      ['blk-b2', '운동', '30분', 'calm'],
      ['goal-g1', '독서 목표', '50%', 'calm'],
    ])
    expect(d.time.nodes.every((n) => n.href === '/time')).toBe(true)
  })
  it('블럭 이름을 못 찾으면 "기록"', () => {
    const d = buildDashboard(input({ sessions: [session({ block_id: 'gone', ended_at: null, started_at: '2026-10-14T11:00:00' })] }))
    expect(d.time.nodes[0].label).toBe('● 기록')
  })
})

describe('Archive', () => {
  it('핀 고정·보관 안 된 것만, 최근 수정 순, 최대 3', () => {
    const d = buildDashboard(input({ items: [
      item({ id: 'p1', pinned: true, title: '레시피', updated_at: '2026-10-10T00:00:00' }),
      item({ id: 'p2', pinned: true, title: '여행', updated_at: '2026-10-12T00:00:00' }),
      item({ id: 'p3', pinned: true, archived: true }),
      item({ id: 'p4', pinned: false }),
    ] }))
    expect(d.archive.nodes.map((n) => [n.id, n.label, n.href])).toEqual([
      ['pin-p2', '📌 여행', '/archive?item=p2'],
      ['pin-p1', '📌 레시피', '/archive?item=p1'],
    ])
  })
  it('제목이 비면 "체크리스트"', () => {
    const d = buildDashboard(input({ items: [item({ pinned: true, title: '' })] }))
    expect(d.archive.nodes[0].label).toBe('📌 체크리스트')
  })
})

describe('빈 상태', () => {
  it('아무것도 없으면 empty', () => {
    expect(buildDashboard(input()).empty).toBe(true)
  })
  it('하나라도 있으면 empty 아님', () => {
    expect(buildDashboard(input({ items: [item({ pinned: true })] })).empty).toBe(false)
  })
})
