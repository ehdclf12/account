# 홈 대시보드(성운 허브) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈 화면(`/`)을 Calendar·Archive·Time 데이터를 자동으로 골라 보여주는 다크 성운 그래프로 바꾸고, 노드를 누르면 해당 항목/날짜가 열린 채로 이동하게 한다.

**Architecture:** 규칙은 순수 함수(`dashboard.ts`)가, 좌표는 순수 함수(`nebula.ts`)가, 주소 파싱은 순수 함수(`deeplink.ts`)가 맡는다. `Nebula.tsx`는 이 결과를 SVG로 그리기만 하고, `HomeMenuScreen`이 기존 React Query 훅으로 데이터를 모아 넘긴다. 새 테이블·API·의존성 없음.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind 3, @tanstack/react-query 5, react-router-dom 7, Vitest + Testing Library(jsdom).

**Spec:** `docs/superpowers/specs/2026-10-14-ontology-dashboard-design.md`

## Global Constraints

- 새 npm 의존성 추가 금지. SVG + CSS 애니메이션만 쓴다(WebGL·캔버스 라이브러리 없음).
- SVG `viewBox="0 0 240 420"` 고정, 화면 폭에 맞춰 확대.
- 누르는 영역은 실제 화면 기준 32px 이상(뷰박스 단위로 가로 28 × 세로 24 이상).
- 항목 라벨은 최대 8자, 넘치면 `…`로 자른다(`…` 포함 8자).
- 최대 노드 수: Deadline 5 · Calendar 3 · Time 4 · Archive 3. 넘치면 `+N`을 추가로 표시.
- Deadline 범위: 기한 ≤ 오늘+7(지난 것 포함). Calendar 범위: 오늘~+14일.
- `prefers-reduced-motion: reduce`이면 깜빡임·맥박·반짝임 애니메이션을 끈다.
- 앱 전체 다크 고정. 상태바 색 `#17171C`.
- 작업 브랜치는 `feat/dashboard`. main에는 사용자 확인 후에만 합친다.
- 이 레포에는 턴마다 `git add -A && git commit && git push` 하는 자동 훅이 있다. 수동 커밋 전에 `git status`로 이미 커밋됐는지 확인하고, 이미 커밋됐으면 그 단계는 건너뛴다.
- 테스트 실행: `npm test` (vitest run). 단일 파일: `npx vitest run <path>`.

## File Structure

| 파일 | 상태 | 책임 |
|---|---|---|
| `src/lib/deeplink.ts` | 신규 | `?item=`/`?date=` 파싱·검증, 링크 주소 생성 |
| `src/lib/deeplink.test.ts` | 신규 | 위 테스트 |
| `src/lib/dashboard.ts` | 신규 | 영역별 노드 선택·정렬·최대 개수·급한 정도·같은 날 연결, 상단 시계 문자열 |
| `src/lib/dashboard.test.ts` | 신규 | 위 테스트 |
| `src/lib/nebula.ts` | 신규 | 허브/영역 고정 좌표, 항목 호 배치, 시드 난수 먼지 노드 |
| `src/lib/nebula.test.ts` | 신규 | 위 테스트 |
| `src/components/dashboard/Nebula.tsx` | 신규 | SVG 그리기 + 클릭 처리 |
| `src/components/dashboard/Nebula.test.tsx` | 신규 | 렌더·클릭·빈 상태·실패 표시 테스트 |
| `src/index.css` | 수정 | `nb-*` 애니메이션 키프레임 + 모션 줄이기 |
| `src/screens/HomeMenuScreen.tsx` | 교체 | 상단 바 + 데이터 수집 + `Nebula` |
| `src/App.tsx` | 수정 | 홈에서는 하단 여백(`pb-8`) 제거 |
| `src/screens/ArchiveScreen.tsx` | 수정 | `?item=` 딥링크 |
| `src/screens/CalendarScreen.tsx` | 수정 | `?date=` 딥링크 |
| `src/lib/theme.ts`, `src/lib/theme.test.ts` | 수정 | `loadTheme`/`saveTheme` 제거, `applyTheme`만 |
| `src/main.tsx` | 수정 | `applyTheme('dark')` |
| `src/components/ThemeToggle.tsx` | 삭제 | |
| `index.html`, `vite.config.ts` | 수정 | 다크 고정(초기 테마 스크립트 제거, 상태바·매니페스트 색) |

---

### Task 1: 작업 브랜치 + 딥링크 파서

**Files:**
- Create: `src/lib/deeplink.ts`
- Test: `src/lib/deeplink.test.ts`

**Interfaces:**
- Produces:
  - `parseDateParam(v: string | null): string | null` — 유효한 `YYYY-MM-DD`만 그대로, 나머지는 `null`
  - `parseItemParam(v: string | null): string | null` — 앞뒤 공백 제거 후 `[0-9A-Za-z-]{1,64}`면 반환, 아니면 `null`
  - `archiveItemHref(id: string): string` → `/archive?item=<id>`
  - `calendarDateHref(iso: string): string` → `/calendar?date=<iso>`

- [ ] **Step 1: 브랜치 만들기**

```bash
git status            # 깨끗한지 확인
git checkout -b feat/dashboard
git push -u origin feat/dashboard   # 자동 훅의 `git push`가 이 브랜치로 가도록 upstream 설정
```

- [ ] **Step 2: 실패하는 테스트 작성** — `src/lib/deeplink.test.ts`

```ts
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
```

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run src/lib/deeplink.test.ts`
Expected: FAIL — `Failed to resolve import "./deeplink"`

- [ ] **Step 4: 구현** — `src/lib/deeplink.ts`

```ts
// 대시보드 노드 → 각 화면으로 '그 항목/날짜가 열린 채' 들어가기 위한 주소 규칙.
// 주소는 사용자가 직접 고칠 수도 있으므로 화면은 반드시 이 파서를 거쳐 읽는다.

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const ITEM_RE = /^[0-9A-Za-z-]{1,64}$/

export function parseDateParam(v: string | null): string | null {
  if (!v) return null
  const m = DATE_RE.exec(v)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const dt = new Date(y, mo - 1, d)
  // 왕복 비교: 2026-02-30 → 3월 2일로 넘어가면 다른 날짜이므로 버린다
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return v
}

export function parseItemParam(v: string | null): string | null {
  if (v == null) return null
  const t = v.trim()
  return ITEM_RE.test(t) ? t : null
}

export function archiveItemHref(id: string): string {
  return `/archive?item=${encodeURIComponent(id)}`
}

export function calendarDateHref(iso: string): string {
  return `/calendar?date=${iso}`
}
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run src/lib/deeplink.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 6: 커밋**

```bash
git add src/lib/deeplink.ts src/lib/deeplink.test.ts
git commit -m "feat: 대시보드 딥링크 주소 파서"
```

---

### Task 2: 대시보드 노드 선택 규칙

**Files:**
- Create: `src/lib/dashboard.ts`
- Test: `src/lib/dashboard.test.ts`

**Interfaces:**
- Consumes: `archiveItemHref`, `calendarDateHref` (Task 1); 기존 `calendarItems`, `isAllDone` (`@/lib/calendar`), `dueStatus` (`@/lib/archive`), `elapsedSeconds`, `formatDuration` (`@/lib/time`), `HolidayMap` (`@/lib/holidays`)
- Produces:
  - `type Domain = 'deadline' | 'calendar' | 'time' | 'archive'`
  - `type Urgency = 'hot' | 'near' | 'far' | 'live' | 'calm'`
  - `interface DashNode { id: string; domain: Domain; label: string; sub: string; urgency: Urgency; href: string; dueISO?: string }`
  - `interface DomainNodes { nodes: DashNode[]; overflow: number }`
  - `interface Dashboard { deadline: DomainNodes; calendar: DomainNodes; time: DomainNodes; archive: DomainNodes; sameDay: Array<[string, string]>; empty: boolean }`
  - `interface DashboardInput { items: ArchiveItem[]; sessions: TimeSession[]; blocks: TimeBlock[]; goals: TimeGoal[]; holidays: HolidayMap; todayISO: string; nowMs: number }`
  - `LIMITS: Record<Domain, number>`, `DOMAINS: Domain[]`
  - `buildDashboard(input: DashboardInput): Dashboard`
  - `shortLabel(s: string, max?: number): string`, `urgencyFor(days: number): Urgency`, `dDayText(days: number): string`, `addDays(iso: string, n: number): string`, `formatClock(nowMs: number): string`

- [ ] **Step 1: 실패하는 테스트 작성** — `src/lib/dashboard.test.ts`

```ts
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
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/dashboard.test.ts`
Expected: FAIL — `Failed to resolve import "./dashboard"`

- [ ] **Step 3: 구현** — `src/lib/dashboard.ts`

```ts
import type { ArchiveItem, TimeBlock, TimeGoal, TimeSession } from '@/types'
import type { HolidayMap } from '@/lib/holidays'
import { calendarItems, isAllDone } from '@/lib/calendar'
import { dueStatus } from '@/lib/archive'
import { elapsedSeconds, formatDuration } from '@/lib/time'
import { archiveItemHref, calendarDateHref } from '@/lib/deeplink'

// 홈 대시보드에 띄울 노드를 고르는 규칙. 화면은 이 결과를 그리기만 한다.

export type Domain = 'deadline' | 'calendar' | 'time' | 'archive'
export type Urgency = 'hot' | 'near' | 'far' | 'live' | 'calm'

export interface DashNode {
  id: string
  domain: Domain
  label: string
  sub: string
  urgency: Urgency
  href: string
  dueISO?: string
}

export interface DomainNodes { nodes: DashNode[]; overflow: number }

export interface Dashboard {
  deadline: DomainNodes
  calendar: DomainNodes
  time: DomainNodes
  archive: DomainNodes
  sameDay: Array<[string, string]>
  empty: boolean
}

export interface DashboardInput {
  items: ArchiveItem[]
  sessions: TimeSession[]
  blocks: TimeBlock[]
  goals: TimeGoal[]
  holidays: HolidayMap
  todayISO: string
  nowMs: number
}

export const DOMAINS: Domain[] = ['deadline', 'calendar', 'archive', 'time']
export const LIMITS: Record<Domain, number> = { deadline: 5, calendar: 3, time: 4, archive: 3 }
const DEADLINE_DAYS = 7
const CALENDAR_DAYS = 14

const pad = (n: number) => String(n).padStart(2, '0')
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function shortLabel(s: string, max = 8): string {
  const chars = Array.from(s.trim())
  return chars.length <= max ? chars.join('') : chars.slice(0, max - 1).join('') + '…'
}

export function urgencyFor(days: number): Urgency {
  if (days <= 0) return 'hot'
  if (days <= 2) return 'near'
  return 'far'
}

export function dDayText(days: number): string {
  if (days < 0) return `D+${-days}`
  if (days === 0) return 'D-DAY'
  return `D-${days}`
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return isoOf(new Date(y, m - 1, d + n))
}

const WEEK_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
export function formatClock(nowMs: number): string {
  const d = new Date(nowMs)
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${WEEK_EN[d.getDay()]} · ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function cap(nodes: DashNode[], domain: Domain): DomainNodes {
  const max = LIMITS[domain]
  return { nodes: nodes.slice(0, max), overflow: Math.max(0, nodes.length - max) }
}

// 기한 있고 · 보관 안 됐고 · 아직 안 끝난 체크리스트
function openChecklists(items: ArchiveItem[]): ArchiveItem[] {
  return calendarItems(items).filter((i) => !i.done && !isAllDone(i))
}

const titleOf = (i: ArchiveItem) => i.title || '체크리스트'

function deadlineNodes(items: ArchiveItem[], today: string): DashNode[] {
  return openChecklists(items)
    .map((i) => ({ i, days: dueStatus(i.due_date, today)!.days }))
    .filter(({ days }) => days <= DEADLINE_DAYS)
    .sort((a, b) => a.days - b.days || titleOf(a.i).localeCompare(titleOf(b.i)))
    .map(({ i, days }): DashNode => ({
      id: `dl-${i.id}`, domain: 'deadline', label: shortLabel(titleOf(i)), sub: dDayText(days),
      urgency: urgencyFor(days), href: archiveItemHref(i.id), dueISO: i.due_date!,
    }))
}

function calendarNodes(items: ArchiveItem[], holidays: HolidayMap, today: string): DashNode[] {
  const open = openChecklists(items)
  const out: DashNode[] = []
  for (let d = 0; d <= CALENDAR_DAYS; d++) {
    const iso = addDays(today, d)
    const count = open.filter((i) => i.due_date === iso).length
    const hol = holidays[iso]
    if (!hol && count === 0) continue
    const [, m, day] = iso.split('-').map(Number)
    out.push({
      id: `cal-${iso}`, domain: 'calendar', label: `${m}/${day}`,
      sub: [hol, count ? `${count}건` : ''].filter(Boolean).join(' · '),
      urgency: urgencyFor(d), href: calendarDateHref(iso), dueISO: iso,
    })
  }
  return out
}

function timeNodes(
  sessions: TimeSession[], blocks: TimeBlock[], goals: TimeGoal[], today: string, nowMs: number,
): DashNode[] {
  const name = (id: string) => blocks.find((b) => b.id === id)?.name ?? '기록'
  const running = sessions.filter((s) => !s.ended_at)
  const runningBlocks = new Set(running.map((s) => s.block_id))

  const live = running.map((s): DashNode => ({
    id: `run-${s.id}`, domain: 'time', label: `● ${shortLabel(name(s.block_id), 7)}`,
    sub: formatDuration(elapsedSeconds(s, nowMs)), urgency: 'live', href: '/time',
  }))

  const totals: Record<string, number> = {}
  for (const s of sessions) {
    if (!s.ended_at || isoOf(new Date(s.started_at)) !== today) continue
    totals[s.block_id] = (totals[s.block_id] ?? 0) + elapsedSeconds(s, nowMs)
  }
  const top = Object.entries(totals)
    .filter(([id, sec]) => !runningBlocks.has(id) && sec > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id, sec]): DashNode => ({
      id: `blk-${id}`, domain: 'time', label: shortLabel(name(id)), sub: formatDuration(sec),
      urgency: 'calm', href: '/time',
    }))

  const open = goals
    .filter((g) => g.checklist.length > 0 && !g.checklist.every((c) => c.done))
    .map((g): DashNode => {
      const done = g.checklist.filter((c) => c.done).length
      return {
        id: `goal-${g.id}`, domain: 'time', label: shortLabel(g.title),
        sub: `${Math.round((done / g.checklist.length) * 100)}%`, urgency: 'calm', href: '/time',
      }
    })

  return [...live, ...top, ...open]
}

function archiveNodes(items: ArchiveItem[]): DashNode[] {
  return items
    .filter((i) => i.pinned && !i.archived)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((i): DashNode => ({
      id: `pin-${i.id}`, domain: 'archive', label: `📌 ${shortLabel(titleOf(i), 7)}`, sub: '',
      urgency: 'calm', href: archiveItemHref(i.id),
    }))
}

// 기한 순으로 정렬돼 있으므로 같은 날짜는 서로 이웃한다
function sameDayPairs(nodes: DashNode[]): Array<[string, string]> {
  const out: Array<[string, string]> = []
  for (let k = 1; k < nodes.length; k++) {
    if (nodes[k].dueISO === nodes[k - 1].dueISO) out.push([nodes[k - 1].id, nodes[k].id])
  }
  return out
}

export function buildDashboard(input: DashboardInput): Dashboard {
  const { items, sessions, blocks, goals, holidays, todayISO: today, nowMs } = input
  const deadline = cap(deadlineNodes(items, today), 'deadline')
  const calendar = cap(calendarNodes(items, holidays, today), 'calendar')
  const time = cap(timeNodes(sessions, blocks, goals, today, nowMs), 'time')
  const archive = cap(archiveNodes(items), 'archive')
  return {
    deadline, calendar, time, archive,
    sameDay: sameDayPairs(deadline.nodes),
    empty: [deadline, calendar, time, archive].every((d) => d.nodes.length === 0),
  }
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/dashboard.test.ts`
Expected: PASS (전부). 실패하면 테스트 기대값이 아니라 구현을 고친다. 단, `formatDuration`의 실제 출력이 `'42분'`/`'1시간'`/`'30분'` 형식인지(`src/lib/time.ts`)를 먼저 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/dashboard.ts src/lib/dashboard.test.ts
git commit -m "feat: 대시보드 노드 선택 규칙"
```

---

### Task 3: 성운 좌표 계산

**Files:**
- Create: `src/lib/nebula.ts`
- Test: `src/lib/nebula.test.ts`

**Interfaces:**
- Consumes: `Domain`, `DOMAINS` (Task 2)
- Produces:
  - `VIEW: { w: 240; h: 420 }`, `interface Pt { x: number; y: number }`, `HUB: Pt`, `DOMAIN_POS: Record<Domain, Pt>`
  - `mulberry32(seed: number): () => number`
  - `interface Dust { x: number; y: number; r: number; o: number; twinkle: boolean }`
  - `interface DustLink { x1: number; y1: number; x2: number; y2: number; o: number }`
  - `makeDust(seed: number, center: Pt, spread: number, n: number): { dots: Dust[]; links: DustLink[] }`
  - `arcPositions(center: Pt, n: number, radius?: number): Pt[]`

- [ ] **Step 1: 실패하는 테스트 작성** — `src/lib/nebula.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { DOMAINS } from './dashboard'
import { VIEW, HUB, DOMAIN_POS, mulberry32, makeDust, arcPositions } from './nebula'

describe('mulberry32', () => {
  it('같은 시드 → 같은 수열', () => {
    const a = mulberry32(7), b = mulberry32(7)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
  it('0 이상 1 미만', () => {
    const r = mulberry32(1)
    for (let i = 0; i < 100; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('makeDust', () => {
  it('같은 시드면 렌더마다 같은 모양', () => {
    expect(makeDust(3, HUB, 100, 40)).toEqual(makeDust(3, HUB, 100, 40))
  })
  it('시드가 다르면 다른 모양', () => {
    expect(makeDust(3, HUB, 100, 40)).not.toEqual(makeDust(4, HUB, 100, 40))
  })
  it('개수와 범위', () => {
    const { dots, links } = makeDust(5, HUB, 50, 30)
    expect(dots).toHaveLength(30)
    expect(links.length).toBeLessThanOrEqual(30)
    for (const d of dots) {
      expect(Math.hypot(d.x - HUB.x, d.y - HUB.y)).toBeLessThanOrEqual(50.5)
    }
  })
})

describe('arcPositions', () => {
  it('0개면 빈 배열', () => {
    expect(arcPositions(DOMAIN_POS.deadline, 0)).toEqual([])
  })
  it('모든 영역에서 1~6개가 서로 18 이상 떨어지고 화면 안에 있다', () => {
    for (const d of DOMAINS) {
      for (let n = 1; n <= 6; n++) {
        const ps = arcPositions(DOMAIN_POS[d], n)
        expect(ps).toHaveLength(n)
        for (const p of ps) {
          expect(p.x).toBeGreaterThanOrEqual(14)
          expect(p.x).toBeLessThanOrEqual(VIEW.w - 14)
          expect(p.y).toBeGreaterThanOrEqual(28)
          expect(p.y).toBeLessThanOrEqual(VIEW.h - 14)
        }
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
          expect(Math.hypot(ps[i].x - ps[j].x, ps[i].y - ps[j].y)).toBeGreaterThanOrEqual(18)
        }
      }
    }
  })
  it('1개면 허브 반대쪽(바깥)으로 놓인다', () => {
    const c = DOMAIN_POS.deadline
    const [p] = arcPositions(c, 1)
    expect(Math.hypot(p.x - HUB.x, p.y - HUB.y)).toBeGreaterThan(Math.hypot(c.x - HUB.x, c.y - HUB.y))
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/nebula.test.ts`
Expected: FAIL — `Failed to resolve import "./nebula"`

- [ ] **Step 3: 구현** — `src/lib/nebula.ts`

```ts
import type { Domain } from '@/lib/dashboard'

// 성운 그래프의 좌표. 장식(먼지 노드)은 고정 시드라 렌더마다 모양이 바뀌지 않는다.

export const VIEW = { w: 240, h: 420 } as const
export interface Pt { x: number; y: number }

export const HUB: Pt = { x: 120, y: 210 }
export const DOMAIN_POS: Record<Domain, Pt> = {
  deadline: { x: 62, y: 120 },
  calendar: { x: 180, y: 128 },
  archive: { x: 60, y: 300 },
  time: { x: 180, y: 300 },
}

export function mulberry32(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Dust { x: number; y: number; r: number; o: number; twinkle: boolean }
export interface DustLink { x1: number; y1: number; x2: number; y2: number; o: number }

const round = (v: number) => Math.round(v * 10) / 10
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function makeDust(seed: number, center: Pt, spread: number, n: number): { dots: Dust[]; links: DustLink[] } {
  const rnd = mulberry32(seed)
  const dots: Dust[] = []
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2
    const d = Math.pow(rnd(), 0.7) * spread
    dots.push({
      x: round(center.x + Math.cos(a) * d),
      y: round(center.y + Math.sin(a) * d * 0.85),
      r: round(0.6 + rnd() * 1.6),
      o: round(0.35 + rnd() * 0.6),
      twinkle: rnd() < 0.25,
    })
  }
  const links: DustLink[] = []
  for (const p of dots) {
    if (rnd() < 0.6) links.push({ x1: center.x, y1: center.y, x2: p.x, y2: p.y, o: round(0.12 + rnd() * 0.25) })
  }
  return { dots, links }
}

// 영역 노드 둘레, 허브 반대쪽(바깥)을 가운데로 하는 호 위에 항목을 고르게 놓는다
export function arcPositions(center: Pt, n: number, radius = 40): Pt[] {
  if (n <= 0) return []
  const outward = Math.atan2(center.y - HUB.y, center.x - HUB.x)
  const step = Math.min(0.75, (Math.PI * 1.1) / n)
  const start = outward - (step * (n - 1)) / 2
  return Array.from({ length: n }, (_, k) => {
    const a = start + step * k
    return {
      x: clamp(round(center.x + Math.cos(a) * radius), 14, VIEW.w - 14),
      y: clamp(round(center.y + Math.sin(a) * radius), 28, VIEW.h - 14),
    }
  })
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/nebula.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lib/nebula.ts src/lib/nebula.test.ts
git commit -m "feat: 성운 그래프 좌표 계산"
```

---

### Task 4: Nebula SVG 컴포넌트

**Files:**
- Create: `src/components/dashboard/Nebula.tsx`
- Modify: `src/index.css` (파일 끝에 추가)
- Test: `src/components/dashboard/Nebula.test.tsx`

**Interfaces:**
- Consumes: `Dashboard`, `DashNode`, `Domain`, `DOMAINS` (Task 2); `VIEW`, `HUB`, `DOMAIN_POS`, `makeDust`, `arcPositions`, `Pt` (Task 3)
- Produces: `default function Nebula(props: { dash: Dashboard; failed: Partial<Record<Domain, boolean>>; onNavigate: (href: string) => void }): JSX.Element`
  - 누를 수 있는 요소는 모두 `role="link"`, 접근 이름(`aria-label`)은 `"<label> <sub>"`(sub 없으면 label만), 영역은 `"<Title> →"`, 넘침은 `"<Title> 더보기 +N"`.

- [ ] **Step 1: 실패하는 테스트 작성** — `src/components/dashboard/Nebula.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Nebula from './Nebula'
import type { Dashboard, DashNode } from '@/lib/dashboard'

const none = { nodes: [], overflow: 0 }
function node(p: Partial<DashNode>): DashNode {
  return { id: 'n', domain: 'deadline', label: '세금신고', sub: 'D+1', urgency: 'hot', href: '/archive?item=a1', ...p }
}
function dash(p: Partial<Dashboard> = {}): Dashboard {
  return { deadline: none, calendar: none, time: none, archive: none, sameDay: [], empty: false, ...p }
}

describe('Nebula', () => {
  it('항목 노드를 누르면 그 주소로 이동한다', () => {
    const go = vi.fn()
    render(<Nebula dash={dash({ deadline: { nodes: [node({})], overflow: 0 } })} failed={{}} onNavigate={go} />)
    fireEvent.click(screen.getByRole('link', { name: '세금신고 D+1' }))
    expect(go).toHaveBeenCalledWith('/archive?item=a1')
  })
  it('Enter 키로도 이동한다', () => {
    const go = vi.fn()
    render(<Nebula dash={dash({ deadline: { nodes: [node({})], overflow: 0 } })} failed={{}} onNavigate={go} />)
    fireEvent.keyDown(screen.getByRole('link', { name: '세금신고 D+1' }), { key: 'Enter' })
    expect(go).toHaveBeenCalledWith('/archive?item=a1')
  })
  it('영역 노드: Deadline·Calendar는 /calendar, Archive는 /archive, Time은 /time', () => {
    const go = vi.fn()
    render(<Nebula dash={dash()} failed={{}} onNavigate={go} />)
    fireEvent.click(screen.getByRole('link', { name: 'Deadline →' }))
    fireEvent.click(screen.getByRole('link', { name: 'Calendar →' }))
    fireEvent.click(screen.getByRole('link', { name: 'Archive →' }))
    fireEvent.click(screen.getByRole('link', { name: 'Time →' }))
    expect(go.mock.calls.map((c) => c[0])).toEqual(['/calendar', '/calendar', '/archive', '/time'])
  })
  it('넘친 개수는 +N으로 보이고 누르면 영역 화면으로', () => {
    const go = vi.fn()
    render(<Nebula dash={dash({ archive: { nodes: [node({ id: 'p', domain: 'archive', label: '📌 레시피', sub: '', href: '/archive?item=p' })], overflow: 2 } })} failed={{}} onNavigate={go} />)
    expect(screen.getByText('+2')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Archive 더보기 +2' }))
    expect(go).toHaveBeenCalledWith('/archive')
  })
  it('비었으면 안내 문구', () => {
    render(<Nebula dash={dash({ empty: true })} failed={{}} onNavigate={() => {}} />)
    expect(screen.getByText('오늘은 비어 있어요')).toBeInTheDocument()
  })
  it('조회 실패한 영역에 실패 문구', () => {
    render(<Nebula dash={dash()} failed={{ time: true }} onNavigate={() => {}} />)
    expect(screen.getAllByText('불러오지 못했어요')).toHaveLength(1)
  })
  it('가운데 허브 라벨', () => {
    render(<Nebula dash={dash()} failed={{}} onNavigate={() => {}} />)
    expect(screen.getByText('나 · TODAY')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/dashboard/Nebula.test.tsx`
Expected: FAIL — `Failed to resolve import "./Nebula"`

- [ ] **Step 3: 애니메이션 CSS 추가** — `src/index.css` 맨 끝에 붙인다

```css
/* 홈 대시보드(성운) 애니메이션. SVG 속성 애니메이션 대신 CSS로 해야 모션 줄이기 설정을 따른다. */
@keyframes nb-blink { 50% { opacity: 0.3; } }
@keyframes nb-pulse { 50% { transform: scale(1.5); } }
@keyframes nb-twinkle { 50% { opacity: 0.15; } }
.nb-blink { animation: nb-blink 1.3s ease-in-out infinite; }
.nb-pulse { animation: nb-pulse 1.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
.nb-twinkle { animation: nb-twinkle 3.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .nb-blink, .nb-pulse, .nb-twinkle { animation: none; }
}
```

- [ ] **Step 4: 컴포넌트 구현** — `src/components/dashboard/Nebula.tsx`

```tsx
import { useMemo } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { DOMAINS, type Dashboard, type DashNode, type Domain } from '@/lib/dashboard'
import { VIEW, HUB, DOMAIN_POS, makeDust, arcPositions, type Pt } from '@/lib/nebula'

const COLOR: Record<Domain, string> = {
  deadline: '#ff8a7e', calendar: '#8ef08a', archive: '#6cb6ff', time: '#a98bff',
}
const TITLE: Record<Domain, string> = {
  deadline: 'Deadline', calendar: 'Calendar', archive: 'Archive', time: 'Time',
}
// 기한만 따로 보는 화면이 없어서 Deadline은 기한을 날짜별로 모아 보는 Calendar로 보낸다
const DOMAIN_HREF: Record<Domain, string> = {
  deadline: '/calendar', calendar: '/calendar', archive: '/archive', time: '/time',
}
const HOT = '#ff6b6b'
const HUB_COLOR = '#d8f6ff'
const LINE = '#bfe9ff'
const FONT = 'ui-monospace, Menlo, monospace'

const RADIUS: Record<DashNode['urgency'], number> = { hot: 3.6, near: 3, far: 2.2, live: 3.2, calm: 2.6 }

interface Props {
  dash: Dashboard
  failed: Partial<Record<Domain, boolean>>
  onNavigate: (href: string) => void
}

// 누를 수 있는 영역. 실제 화면 기준 32px 이상이 되도록 투명 사각형을 깐다.
function Tap({ label, onGo, at, children }: { label: string; onGo: () => void; at: Pt; children: ReactNode }) {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onGo() } }
  return (
    <g role="link" tabIndex={0} aria-label={label} onClick={onGo} onKeyDown={onKey} style={{ cursor: 'pointer', outline: 'none' }}>
      <rect x={at.x - 16} y={at.y - 14} width={32} height={26} fill="transparent" />
      {children}
    </g>
  )
}

export default function Nebula({ dash, failed, onNavigate }: Props) {
  const dust = useMemo(() => ({
    hub: makeDust(1, HUB, 110, 120),
    ...Object.fromEntries(DOMAINS.map((d, i) => [d, makeDust(10 + i, DOMAIN_POS[d], 34, 22)])),
  }) as Record<'hub' | Domain, ReturnType<typeof makeDust>>, [])

  // 같은 날 연결선을 그리려고 노드 id → 좌표를 모은다
  const placed = new Map<string, Pt>()
  for (const d of DOMAINS) {
    const { nodes, overflow } = dash[d]
    const ps = arcPositions(DOMAIN_POS[d], nodes.length + (overflow > 0 ? 1 : 0))
    nodes.forEach((n, k) => placed.set(n.id, ps[k]))
    if (overflow > 0) placed.set(`${d}-more`, ps[nodes.length])
  }

  return (
    <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} width="100%" style={{ display: 'block', fontFamily: FONT }} aria-label="오늘의 그래프">
      <defs>
        <filter id="nb-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="nb-blur" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <marker id="nb-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L6 3 L0 6 Z" fill={LINE} />
        </marker>
      </defs>

      {/* 장식: 먼지 노드 (누를 수 없음) */}
      <g aria-hidden="true" pointerEvents="none">
        {(['hub', ...DOMAINS] as const).map((k) => {
          const color = k === 'hub' ? '#7fe8ff' : COLOR[k]
          return (
            <g key={k}>
              {dust[k].links.map((l, i) => (
                <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={color} strokeWidth={0.25} opacity={l.o} />
              ))}
              {dust[k].dots.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={color} opacity={p.o} className={p.twinkle ? 'nb-twinkle' : undefined} />
              ))}
            </g>
          )
        })}
      </g>

      {/* 허브 → 영역 화살표 */}
      <g aria-hidden="true" pointerEvents="none">
        {DOMAINS.map((d) => (
          <line key={d} x1={HUB.x} y1={HUB.y} x2={DOMAIN_POS[d].x} y2={DOMAIN_POS[d].y}
            stroke={LINE} strokeWidth={0.7} opacity={0.7} markerEnd="url(#nb-arrow)" />
        ))}
      </g>

      {/* 허브: 원 + 사각 프레임 */}
      <g aria-hidden="true" pointerEvents="none">
        <rect x={HUB.x - 30} y={HUB.y - 26} width={60} height={52} fill="none" stroke={LINE} strokeWidth={0.6} opacity={0.55} />
        <path d={`M${HUB.x - 6} ${HUB.y - 36} H${HUB.x + 6} M${HUB.x} ${HUB.y - 40} V${HUB.y - 26} M${HUB.x - 6} ${HUB.y + 36} H${HUB.x + 6} M${HUB.x} ${HUB.y + 26} V${HUB.y + 40}`}
          stroke={LINE} strokeWidth={0.7} opacity={0.7} />
        <circle cx={HUB.x} cy={HUB.y} r={31} fill={HUB_COLOR} opacity={0.2} filter="url(#nb-blur)" />
        <circle cx={HUB.x} cy={HUB.y} r={12} fill={HUB_COLOR} filter="url(#nb-glow)" />
        <circle cx={HUB.x} cy={HUB.y} r={20} fill="none" stroke={HUB_COLOR} strokeWidth={0.7} opacity={0.7} />
        <text x={HUB.x} y={HUB.y + 36 + 14} textAnchor="middle" fontSize={7} fill="#eafaff">나 · TODAY</text>
        {dash.empty && (
          <text x={HUB.x} y={HUB.y + 64} textAnchor="middle" fontSize={6} fill="#7f97a8">오늘은 비어 있어요</text>
        )}
      </g>

      {/* 같은 날 연결 */}
      <g aria-hidden="true" pointerEvents="none">
        {dash.sameDay.map(([a, b]) => {
          const p = placed.get(a), q = placed.get(b)
          if (!p || !q) return null
          return (
            <g key={`${a}-${b}`}>
              <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#a98bff" strokeWidth={0.6} strokeDasharray="2 2" />
              <text x={(p.x + q.x) / 2} y={(p.y + q.y) / 2 - 3} textAnchor="middle" fontSize={5} fill="#cdbbff">⚡ 같은 날</text>
            </g>
          )
        })}
      </g>

      {DOMAINS.map((d) => {
        const c = DOMAIN_POS[d]
        const { nodes, overflow } = dash[d]
        const more = placed.get(`${d}-more`)
        return (
          <g key={d}>
            {/* 영역 노드 */}
            <Tap label={`${TITLE[d]} →`} onGo={() => onNavigate(DOMAIN_HREF[d])} at={c}>
              <circle cx={c.x} cy={c.y} r={15} fill={COLOR[d]} opacity={0.22} filter="url(#nb-blur)" />
              <circle cx={c.x} cy={c.y} r={6} fill={COLOR[d]} filter="url(#nb-glow)" />
              <circle cx={c.x} cy={c.y} r={10} fill="none" stroke={COLOR[d]} strokeWidth={0.7} opacity={0.7} />
              <text x={c.x} y={c.y + 18} textAnchor="middle" fontSize={6.5} fill="#e6f4ff">{TITLE[d]} →</text>
            </Tap>
            {failed[d] && (
              <text x={c.x} y={c.y + 27} textAnchor="middle" fontSize={5.4} fill="#7f97a8">불러오지 못했어요</text>
            )}

            {/* 항목 노드 */}
            {nodes.map((n) => {
              const p = placed.get(n.id)!
              const color = n.urgency === 'hot' ? HOT : COLOR[d]
              const r = RADIUS[n.urgency]
              const cls = n.urgency === 'hot' ? 'nb-blink' : n.urgency === 'live' ? 'nb-pulse' : undefined
              return (
                <Tap key={n.id} label={n.sub ? `${n.label} ${n.sub}` : n.label} onGo={() => onNavigate(n.href)} at={p}>
                  <line x1={c.x} y1={c.y} x2={p.x} y2={p.y} stroke={color} strokeWidth={0.5} opacity={0.6} />
                  <circle cx={p.x} cy={p.y} r={r * 2.6} fill={color} opacity={0.22} filter="url(#nb-blur)" />
                  <circle cx={p.x} cy={p.y} r={r} fill={color} filter="url(#nb-glow)" opacity={n.urgency === 'far' ? 0.55 : 1} className={cls} />
                  <text x={p.x} y={p.y - 6} textAnchor="middle" fontSize={6} fill="#e6f4ff">{n.label}</text>
                  {n.sub && <text x={p.x} y={p.y + 10} textAnchor="middle" fontSize={5.4} fill={color}>{n.sub}</text>}
                </Tap>
              )
            })}

            {/* 넘침 +N */}
            {more && (
              <Tap label={`${TITLE[d]} 더보기 +${overflow}`} onGo={() => onNavigate(DOMAIN_HREF[d])} at={more}>
                <circle cx={more.x} cy={more.y} r={2} fill={COLOR[d]} opacity={0.6} />
                <text x={more.x} y={more.y - 5} textAnchor="middle" fontSize={6} fill={COLOR[d]}>+{overflow}</text>
              </Tap>
            )}
          </g>
        )
      })}
    </svg>
  )
}
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run src/components/dashboard/Nebula.test.tsx`
Expected: PASS (7 tests)

- [ ] **Step 6: 커밋**

```bash
git add src/components/dashboard src/index.css
git commit -m "feat: 성운 대시보드 SVG 컴포넌트"
```

---

### Task 5: 홈 화면 교체

**Files:**
- Modify (전체 교체): `src/screens/HomeMenuScreen.tsx`
- Modify: `src/App.tsx` (래퍼 `pb-8`)

**Interfaces:**
- Consumes: `buildDashboard`, `addDays`, `formatClock`, `DOMAINS`, `Domain` (Task 2); `Nebula` (Task 4); 기존 훅 `useArchiveItems`(`@/hooks/useArchive`), `useTimeSessions`, `useTimeBlocks`(`@/hooks/useTimeBlocks`), `useTimeGoals`(`@/hooks/useTimeGoals`), `useHolidays`(`@/hooks/useHolidays`), `todayISO`(`@/lib/date`), `supabase`(`@/lib/supabase`)
- Produces: 없음(화면). 이 작업 후 `ThemeToggle`은 아무 데서도 import되지 않는다(Task 7에서 삭제).

- [ ] **Step 1: `HomeMenuScreen.tsx` 전체 교체**

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { todayISO } from '@/lib/date'
import { addDays, buildDashboard, formatClock, type Domain } from '@/lib/dashboard'
import { useArchiveItems } from '@/hooks/useArchive'
import { useTimeBlocks, useTimeSessions } from '@/hooks/useTimeBlocks'
import { useTimeGoals } from '@/hooks/useTimeGoals'
import { useHolidays } from '@/hooks/useHolidays'
import Nebula from '@/components/dashboard/Nebula'

export default function HomeMenuScreen() {
  const nav = useNavigate()

  // 진행 중 기록 시간과 상단 시계를 1분마다 갱신한다
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  const today = todayISO()
  const years = [...new Set([today, addDays(today, 14)].map((d) => Number(d.slice(0, 4))))]
  const holidays = useHolidays(years)
  const items = useArchiveItems()
  const sessions = useTimeSessions()
  const blocks = useTimeBlocks()
  const goals = useTimeGoals()

  const dash = buildDashboard({
    items: items.data ?? [], sessions: sessions.data ?? [], blocks: blocks.data ?? [],
    goals: goals.data ?? [], holidays, todayISO: today, nowMs,
  })
  // 로딩 중에 '비어 있어요'가 번쩍이지 않게, 전부 받아온 뒤에만 빈 상태로 본다
  const loaded = [items, sessions, blocks, goals].every((q) => q.isSuccess)
  const timeFailed = sessions.isError || blocks.isError || goals.isError
  const failed: Partial<Record<Domain, boolean>> = {
    deadline: items.isError, calendar: items.isError, archive: items.isError, time: timeFailed,
  }

  function logout() {
    if (window.confirm('로그아웃할까요?')) supabase.auth.signOut()
  }

  return (
    <div className="min-h-[100dvh]" style={{ background: 'radial-gradient(ellipse at 50% 48%, #06121c 0%, #000 70%)' }}>
      <div className="flex items-center justify-between px-4 pt-4 font-mono text-xs text-[#7f97a8]">
        <span>{formatClock(nowMs)}</span>
        <span className="flex items-center gap-3">
          <span className="text-[#7fe8ff]">● LIVE</span>
          <button onClick={logout} aria-label="로그아웃" className="text-base px-1 active:opacity-60">⏻</button>
        </span>
      </div>
      <Nebula dash={{ ...dash, empty: dash.empty && loaded }} failed={failed} onNavigate={(href) => nav(href)} />
    </div>
  )
}
```

- [ ] **Step 2: `App.tsx` — 홈에서는 하단 여백을 없앤다** (검정 배경 아래로 다른 색 띠가 보이지 않게)

찾을 코드:
```tsx
  const wide = pathname === '/calendar'
```
바꿀 코드:
```tsx
  const wide = pathname === '/calendar'
  const home = pathname === '/'
```

찾을 코드:
```tsx
        <div className={`${wide ? 'max-w-2xl' : 'max-w-md'} mx-auto min-h-full pb-8`}>
```
바꿀 코드:
```tsx
        <div className={`${wide ? 'max-w-2xl' : 'max-w-md'} mx-auto min-h-full ${home ? '' : 'pb-8'}`}>
```

- [ ] **Step 3: 빌드·테스트**

Run: `npm run build && npm test`
Expected: 빌드 성공(타입 오류 없음), 테스트 전부 PASS

- [ ] **Step 4: 로컬에서 눈으로 확인**

Run: `npm run dev` → 브라우저(휴대폰 크기로 개발자도구 설정)에서 `http://localhost:5173/` 로그인 후 확인:
- 상단에 `MM.DD 요일 · HH:MM`, `● LIVE`, `⏻`
- 가운데 허브 `나 · TODAY`, 4개 영역 노드, 실제 데이터 항목 노드
- 항목 노드를 누르면 해당 주소로 이동(아직 Task 6 전이라 팝업은 안 열려도 정상)
- `⏻` → 확인창 → 취소하면 그대로

- [ ] **Step 5: 커밋**

```bash
git add src/screens/HomeMenuScreen.tsx src/App.tsx
git commit -m "feat: 홈을 성운 대시보드로 교체"
```

---

### Task 6: Archive·Calendar 딥링크

**Files:**
- Modify: `src/screens/ArchiveScreen.tsx` (import 1행, 44행 근처 `useArchiveItems`, 57행 근처 상태 선언 뒤)
- Modify: `src/screens/CalendarScreen.tsx` (import 1행, 33~37행 상태 초기값)

**Interfaces:**
- Consumes: `parseItemParam`, `parseDateParam` (Task 1)
- Produces: `/archive?item=<id>` → 상세 팝업이 열린 채 시작, `/calendar?date=<iso>` → 그 날짜·그 달로 시작. 둘 다 연 뒤 쿼리를 `replace`로 지운다.

- [ ] **Step 1: ArchiveScreen — import**

찾을 코드:
```tsx
import { useState } from 'react'
```
바꿀 코드:
```tsx
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { parseItemParam } from '@/lib/deeplink'
```

- [ ] **Step 2: ArchiveScreen — 로딩 완료 여부 받기**

찾을 코드:
```tsx
  const { data: items = [] } = useArchiveItems()
```
바꿀 코드:
```tsx
  const { data: items = [], isSuccess: itemsLoaded } = useArchiveItems()
```

- [ ] **Step 3: ArchiveScreen — 딥링크 효과** (`const [manageFolders, setManageFolders] = useState(false)` 바로 아래에 추가)

```tsx
  // 대시보드에서 /archive?item=<id>로 들어오면 그 항목 상세 팝업을 연다.
  // 항목 목록이 다 온 뒤에 판단하고, 연 뒤에는 주소에서 지워 뒤로 가기·새로고침 때 다시 열리지 않게 한다.
  const [params, setParams] = useSearchParams()
  useEffect(() => {
    if (!params.has('item') || !itemsLoaded) return
    const id = parseItemParam(params.get('item'))
    const hit = id ? items.find((i) => i.id === id) : undefined
    if (hit) setDetail(hit)
    setParams({}, { replace: true })
  }, [params, itemsLoaded, items, setParams])
```

- [ ] **Step 4: CalendarScreen — import**

찾을 코드:
```tsx
import { useRef, useState } from 'react'
```
바꿀 코드:
```tsx
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { parseDateParam } from '@/lib/deeplink'
```

- [ ] **Step 5: CalendarScreen — 초기 날짜·달**

찾을 코드:
```tsx
  const [cursor, setCursor] = useState(() => {
    const n = new Date()
    return { year: n.getFullYear(), month: n.getMonth() + 1 }
  })
  const [selected, setSelected] = useState(today)
```
바꿀 코드:
```tsx
  // 대시보드에서 /calendar?date=YYYY-MM-DD로 들어오면 그 날짜와 그 달로 시작한다
  const [params, setParams] = useSearchParams()
  const linked = parseDateParam(params.get('date'))
  const [cursor, setCursor] = useState(() => {
    if (linked) {
      const [y, m] = linked.split('-').map(Number)
      return { year: y, month: m }
    }
    const n = new Date()
    return { year: n.getFullYear(), month: n.getMonth() + 1 }
  })
  const [selected, setSelected] = useState(linked ?? today)
  useEffect(() => {
    if (params.has('date')) setParams({}, { replace: true })
  }, [params, setParams])
```

- [ ] **Step 6: 빌드·테스트**

Run: `npm run build && npm test`
Expected: 성공, 전부 PASS

- [ ] **Step 7: 로컬 확인** (`npm run dev`)
- `http://localhost:5173/archive?item=<실제 항목 id>` → 상세 팝업이 열린 채 시작, 주소창이 `/archive`로 바뀜
- `http://localhost:5173/archive?item=없는id` → 팝업 없이 평소 화면
- `http://localhost:5173/calendar?date=2026-11-03` → 11월, 3일 선택
- `http://localhost:5173/calendar?date=2026-13-01` → 오늘 기준 평소 화면
- 홈에서 항목 노드 탭 → 위와 같이 열림 / 메뉴에서 평소 진입은 기존과 동일

- [ ] **Step 8: 커밋**

```bash
git add src/screens/ArchiveScreen.tsx src/screens/CalendarScreen.tsx
git commit -m "feat: Archive·Calendar 딥링크로 항목/날짜 바로 열기"
```

---

### Task 7: 다크 고정

**Files:**
- Modify: `src/lib/theme.ts`, `src/lib/theme.test.ts`, `src/main.tsx`, `index.html`, `vite.config.ts`
- Delete: `src/components/ThemeToggle.tsx`

**Interfaces:**
- Consumes: 없음
- Produces: `applyTheme(t: Theme): void` 만 남는다(`loadTheme`/`saveTheme` 삭제).

- [ ] **Step 1: 테스트를 새 동작으로 교체** — `src/lib/theme.test.ts` 전체 교체

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { applyTheme } from './theme'

describe('applyTheme', () => {
  beforeEach(() => {
    document.head.innerHTML = '<meta name="theme-color" content="#FFFFFF">'
    delete document.documentElement.dataset.theme
  })

  it('html에 data-theme을 단다', () => {
    applyTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
  it('상태바 색을 다크 배경색으로 바꾼다', () => {
    applyTheme('dark')
    expect(document.querySelector('meta[name="theme-color"]')!.getAttribute('content')).toBe('#17171C')
  })
})
```

- [ ] **Step 2: 통과 확인(기존 applyTheme로 이미 통과해야 함)**

Run: `npx vitest run src/lib/theme.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 3: `src/lib/theme.ts` 전체 교체**

```ts
export type Theme = 'light' | 'dark'

// 앱은 다크로 고정한다(홈 대시보드 디자인). 상태바 색(PWA)도 함께 맞춘다.
const THEME_COLOR: Record<Theme, string> = { light: '#FFFFFF', dark: '#17171C' }

export function applyTheme(t: Theme): void {
  document.documentElement.dataset.theme = t
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLOR[t])
}
```

- [ ] **Step 4: `src/main.tsx`**

찾을 코드:
```tsx
import { applyTheme, loadTheme } from '@/lib/theme'
```
바꿀 코드:
```tsx
import { applyTheme } from '@/lib/theme'
```

찾을 코드:
```tsx
applyTheme(loadTheme())
```
바꿀 코드:
```tsx
applyTheme('dark')
```

- [ ] **Step 5: `ThemeToggle.tsx` 삭제**

```bash
grep -rn "ThemeToggle" src   # 결과가 ThemeToggle.tsx 자기 자신뿐인지 확인
git rm src/components/ThemeToggle.tsx
```

- [ ] **Step 6: `index.html` — 첫 화면부터 다크**

찾을 코드:
```html
<html lang="ko">
```
바꿀 코드:
```html
<html lang="ko" data-theme="dark">
```

찾을 코드:
```html
    <meta name="theme-color" content="#FFFFFF" />
```
바꿀 코드:
```html
    <meta name="theme-color" content="#17171C" />
```

찾을 코드:
```html
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
```
바꿀 코드:
```html
    <meta name="apple-mobile-web-app-status-bar-style" content="black" />
```

아래 블록 전체 삭제(localStorage에서 테마를 읽던 초기 스크립트):
```html
    <script>
      try {
        var t = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
        document.documentElement.dataset.theme = t
        var m = document.querySelector('meta[name="theme-color"]')
        if (m) m.setAttribute('content', t === 'dark' ? '#17171C' : '#FFFFFF')
      } catch {}
    </script>
```

- [ ] **Step 7: `vite.config.ts` — PWA 매니페스트 색**

찾을 코드:
```ts
        theme_color: '#FFFFFF',
        background_color: '#ffffff',
```
바꿀 코드:
```ts
        theme_color: '#17171C',
        background_color: '#17171C',
```

- [ ] **Step 8: 빌드·테스트**

Run: `npm run build && npm test`
Expected: 성공, 전부 PASS. `grep -rn "loadTheme\|saveTheme\|ThemeToggle" src index.html` 결과 없음.

- [ ] **Step 9: 커밋**

```bash
git add -A src/lib/theme.ts src/lib/theme.test.ts src/main.tsx index.html vite.config.ts src/components/ThemeToggle.tsx
git commit -m "feat: 앱 전체 다크 고정, 테마 토글 제거"
```

---

### Task 8: 최종 검증 + 미리보기 배포

**Files:** 없음(검증만)

- [ ] **Step 1: 전체 검증**

```bash
npm run build && npm test
grep -rn "loadTheme\|saveTheme\|ThemeToggle" src index.html   # 결과 없어야 함
git status                                                     # 깨끗해야 함
```
Expected: 빌드 성공, 테스트 전부 PASS, grep 결과 없음.

- [ ] **Step 2: 브랜치 push → Vercel 미리보기**

```bash
git push   # Task 1에서 upstream을 걸어 feat/dashboard로 올라간다
```
Vercel 대시보드 → 프로젝트 → Deployments에서 `feat/dashboard` 미리보기 주소를 찾는다.
(미리보기에 Vercel 로그인 보호가 켜져 있으면 휴대폰에서도 Vercel 계정 로그인이 필요하다.)

- [ ] **Step 3: 사용자 실기기 확인 요청** — 휴대폰에서 미리보기 주소로:
- 홈: 다크 성운, 실제 데이터 노드, 지남/오늘 빨강 깜빡임, 진행 중 기록 맥박
- 노드 탭 → Archive 팝업 / Calendar 날짜 / Time 이동, 뒤로 가기 시 팝업이 다시 안 열림
- Calendar·Archive·Time 화면이 다크로 보임
- iOS 설정 → 손쉬운 사용 → 동작 줄이기 켜면 애니메이션 멈춤
- `⏻` 로그아웃

- [ ] **Step 4: 사용자 승인 후 main에 합치기** (승인 없이는 하지 않는다)

```bash
git checkout main
git pull
git merge --no-ff feat/dashboard -m "Merge feat/dashboard: 홈 성운 대시보드"
git push
```
