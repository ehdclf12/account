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
