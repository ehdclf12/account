import { DOMAINS, LIMITS, type Domain } from '@/lib/dashboard'

// 성운 그래프의 자리 잡기. 그래프가 차지한 실제 크기(CSS px, 1단위 = 1px)를 받아
// 허브·영역·항목 위치와 글자 상자·탭 영역을 계산한다. 장식(먼지 노드)은 고정 시드라 렌더마다 모양이 같다.

export interface Pt { x: number; y: number }
export interface Size { w: number; h: number }
export interface Rect { x1: number; y1: number; x2: number; y2: number }

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

// 먼지는 글자를 가리지 않게 흐리게(0.35 이하), 연결선도 적게
export function makeDust(seed: number, center: Pt, spread: number, n: number): { dots: Dust[]; links: DustLink[] } {
  const rnd = mulberry32(seed)
  const dots: Dust[] = []
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2
    const d = Math.pow(rnd(), 0.7) * spread
    dots.push({
      x: round(center.x + Math.cos(a) * d),
      y: round(center.y + Math.sin(a) * d * 0.85),
      r: round(0.8 + rnd() * 1.6),
      o: round(0.12 + rnd() * 0.23),
      twinkle: rnd() < 0.25,
    })
  }
  const links: DustLink[] = []
  for (const p of dots) {
    if (rnd() < 0.3) links.push({ x1: center.x, y1: center.y, x2: p.x, y2: p.y, o: round(0.08 + rnd() * 0.15) })
  }
  return { dots, links }
}

// 라벨 글자 폭 어림. 한글·한자·이모지·기호(U+2000 이상)는 대체 글꼴에서 거의 1em, 나머지 고정폭은 0.6em.
export function labelWidth(text: string, fontSize: number): number {
  let em = 0
  for (const ch of text) em += ch.codePointAt(0)! >= 0x2000 ? 1 : 0.6
  return em * fontSize
}

// 폭을 넘으면 뒤를 잘라 …를 붙인다
export function fitText(text: string, fontSize: number, maxW: number): string {
  if (labelWidth(text, fontSize) <= maxW) return text
  const chars = Array.from(text)
  while (chars.length > 0 && labelWidth(chars.join('') + '…', fontSize) > maxW) chars.pop()
  return chars.join('').trimEnd() + '…'
}

// 기준선 위치와 글자 크기로 글자 상자 (위로 0.8em, 아래로 0.2em)
export function textBox(x: number, anchor: 'start' | 'middle' | 'end', w: number, baseline: number, fs: number): Rect {
  const x1 = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2
  return { x1, x2: x1 + w, y1: baseline - fs * 0.8, y2: baseline + fs * 0.2 }
}

export const overlaps = (a: Rect, b: Rect) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2

// 글자 크기(px). 기기와 상관없이 고정.
export const ITEM = { size: 13, subSize: 11 } as const
export const DOMAIN_FONT = 15
export const HUB_FONT = 14
export const EMPTY_FONT = 14
export const FAILED_FONT = 11
export const CAPTION_FONT = 11
export const HUB_LABEL = '나 · TODAY'
export const EMPTY_TEXT = '오늘은 비어 있어요'
export const SAME_DAY_TEXT = '⚡ 같은 날'

// 항목 한 줄: 노드 중심(y) 기준. 제목 기준선 y+4, 부제 기준선 y+17. 탭 영역은 [y-9, y+21] = 30px, 줄 간격 32px.
const ROW = { labelDy: 4, subDy: 17, top: -9, bottom: 21 } as const
const PITCH = 32
const ROW_H = ROW.bottom - ROW.top
const GAP = 10 // 노드 중심 → 글자 끝
const PAD = 4 // 글자 → 배경/탭 영역 가장자리
const EDGE = 6 // 화면 가장자리 여백
const MAX_TEXT_W = 120 // 8글자 한글(104) · 📌+7글자(112)가 들어가는 폭
const MIN_TEXT_W = 14
// 영역 노드: 이름은 아래 기준선 +30, 실패 문구 +48. 탭 영역은 [-14, +36], 폭은 가장 긴 이름("Deadline →" 96px) 기준.
const DOMAIN_LABEL_DY = 30
const FAILED_DY = 48
const DOMAIN_HIT = { top: -14, bottom: 36, half: 52 } as const
// 허브: 이름 기준선 +60, 빈 안내 +82
const HUB_LABEL_DY = 60
const EMPTY_DY = 82
// 가로 배치에서 항목 줄을 영역 노드에서 얼마나 바깥쪽에 둘지 (그 사이에 '같은 날' 문구가 들어간다)
const LAND_ITEM_OFF = 124

export interface Slot {
  x: number; y: number
  textX: number; anchor: 'start' | 'end'
  labelY: number; subY: number
  hit: Rect
}

export interface DomainLayout {
  c: Pt
  side: 'left' | 'right'
  inward: 1 | -1 // 허브 쪽 가로 방향
  slots: Slot[] // 보이는 항목 (앞에서부터)
  more: Slot | null // +N 칸
  visible: number
  moreCount: number // 숨긴 항목 + 원래 넘침
  labelY: number; labelBox: Rect
  failedY: number; failedBox: Rect
  hit: Rect
}

export interface NebulaLayout {
  w: number; h: number
  orientation: 'portrait' | 'landscape'
  textW: number // 항목 라벨·부제가 쓸 수 있는 최대 폭
  hub: Pt
  hubLabelY: number; hubLabelBox: Rect
  emptyY: number; emptyBox: Rect
  domains: Record<Domain, DomainLayout>
}

export type Counts = Record<Domain, { nodes: number; overflow: number }>

const SIDE: Record<Domain, 'left' | 'right'> = { deadline: 'left', archive: 'left', calendar: 'right', time: 'right' }
const UPPER: Record<Domain, boolean> = { deadline: true, calendar: true, archive: false, time: false }
const slotsNeeded = (d: Domain) => LIMITS[d] + 1

function slotAt(x: number, y: number, side: 'left' | 'right', textW: number): Slot {
  const left = side === 'left'
  const textX = left ? x - GAP : x + GAP
  const hit = left
    ? { x1: textX - textW - PAD, x2: x + 16, y1: y + ROW.top, y2: y + ROW.bottom }
    : { x1: x - 16, x2: textX + textW + PAD, y1: y + ROW.top, y2: y + ROW.bottom }
  return { x, y, textX, anchor: left ? 'end' : 'start', labelY: y + ROW.labelDy, subY: y + ROW.subDy, hit }
}

// 줄 수 n개가 [lo, hi] 높이 안에 들어가는지 → 최대 줄 수
const capacity = (span: number) => (span < ROW_H ? 0 : Math.floor((span - ROW_H) / PITCH) + 1)

// 칸이 모자라면 보이는 항목을 줄이고 그만큼 +N에 더한다
function fit(nodes: number, overflow: number, cap: number) {
  const total = nodes + overflow
  const need = nodes + (overflow > 0 ? 1 : 0)
  const visible = need <= cap ? nodes : Math.max(0, cap - 1)
  const moreCount = total - visible
  return { visible, moreCount, showMore: moreCount > 0 && cap > visible }
}

export function layoutNebula(size: Size, counts: Counts): NebulaLayout {
  const W = Math.max(0, size.w), H = Math.max(0, size.h)
  const orientation = W / Math.max(1, H) > 1.1 ? 'landscape' : 'portrait'
  const hub = { x: round(W / 2), y: round(H / 2) }
  const half = W / 2

  let textW: number
  const pos = {} as Record<Domain, Pt>
  if (orientation === 'portrait') {
    // 가운데 줄을 넘지 않게: 왼쪽 탭 영역 오른끝(노드+16) ≤ W/2-2, 왼끝(노드-GAP-폭-PAD) ≥ EDGE
    textW = clamp(Math.floor(half - 2 - 16 - GAP - PAD - EDGE), MIN_TEXT_W, MAX_TEXT_W)
    const cxL = clamp(W * 0.23, EDGE + DOMAIN_HIT.half, half - 2 - DOMAIN_HIT.half)
    // 위 영역: 위로 6줄이 들어가게, 아래 영역: 아래로 5줄이 들어가게. 허브 이름·빈 안내와는 떨어뜨린다.
    const upRows = Math.max(slotsNeeded('deadline'), slotsNeeded('calendar'))
    const downRows = Math.max(slotsNeeded('archive'), slotsNeeded('time'))
    const needTop = EDGE - ROW.top + (upRows - 1) * PITCH + ROW.bottom - DOMAIN_HIT.top + 4
    const needBottom = DOMAIN_HIT.bottom + 16 - ROW.top + (downRows - 1) * PITCH + ROW.bottom + EDGE
    const cyT = clamp(Math.min(Math.max(H * 0.25, needTop), H / 2 - 60), EDGE - DOMAIN_HIT.top, H)
    const cyB = clamp(Math.max(Math.min(H * 0.75, H - needBottom), H / 2 + 76), 0, H - EDGE - FAILED_DY - 3)
    pos.deadline = { x: cxL, y: cyT }
    pos.calendar = { x: W - cxL, y: cyT }
    pos.archive = { x: cxL, y: cyB }
    pos.time = { x: W - cxL, y: cyB }
  } else {
    // 항목 줄은 영역 노드에서 바깥쪽으로 LAND_ITEM_OFF 떨어진 세로 줄, 라벨은 그 바깥쪽
    textW = clamp(Math.floor(half - 130 - LAND_ITEM_OFF - GAP - PAD - EDGE), MIN_TEXT_W, MAX_TEXT_W)
    const cxL = clamp(W * 0.3, EDGE + PAD + textW + GAP + LAND_ITEM_OFF, half - 130)
    const cyU = clamp(H * 0.3, EDGE - DOMAIN_HIT.top, H / 2 - 30)
    const cyD = clamp(H * 0.7, H / 2 + 30, H - EDGE - FAILED_DY - 3)
    pos.deadline = { x: cxL, y: cyU }
    pos.archive = { x: cxL, y: cyD }
    pos.calendar = { x: W - cxL, y: cyU }
    pos.time = { x: W - cxL, y: cyD }
  }

  const domains = {} as Record<Domain, DomainLayout>
  for (const d of DOMAINS) {
    const c = { x: round(pos[d].x), y: round(pos[d].y) }
    const side = SIDE[d]
    const inward: 1 | -1 = side === 'left' ? 1 : -1
    const upper = UPPER[d]
    const { nodes, overflow } = counts[d]

    // 줄 놓기: 줄 k의 노드 y
    let ys: (k: number) => number
    let xs: (k: number) => number
    let cap: number
    if (orientation === 'portrait') {
      // 허브 반대쪽(위 영역은 위, 아래 영역은 아래)으로 쌓고, 멀어질수록 허브 쪽으로 조금 기울여 호를 이룬다
      const minX = side === 'left' ? EDGE + PAD + textW + GAP : half + 18
      const maxX = side === 'left' ? half - 18 : W - EDGE - PAD - textW - GAP
      xs = (k) => clamp(c.x + inward * (2 + 3 * k), minX, maxX)
      if (upper) {
        const y0 = c.y + DOMAIN_HIT.top - 4 - ROW.bottom
        ys = (k) => y0 - PITCH * k
        cap = capacity(y0 + ROW.bottom - EDGE)
      } else {
        const y0 = c.y + DOMAIN_HIT.bottom + 16 - ROW.top
        ys = (k) => y0 + PITCH * k
        cap = capacity(H - EDGE - (y0 + ROW.top))
      }
    } else {
      // 위/아래 절반 띠 안에서 영역 높이를 가운데로 세로 줄을 세운다
      const lo = upper ? EDGE : H / 2 + 2
      const hi = upper ? H / 2 - 2 : H - EDGE
      cap = capacity(hi - lo)
      const x = c.x - inward * LAND_ITEM_OFF
      xs = () => x
      const rows = Math.min(cap, nodes + (overflow > 0 ? 1 : 0))
      const span = rows > 0 ? (rows - 1) * PITCH + ROW_H : 0
      const top = clamp(c.y + 6 - span / 2, lo, hi - span)
      ys = (k) => top - ROW.top + PITCH * k
    }

    const { visible, moreCount, showMore } = fit(nodes, overflow, cap)
    const slots = Array.from({ length: visible }, (_, k) => slotAt(round(xs(k)), round(ys(k)), side, textW))
    const more = showMore ? slotAt(round(xs(visible)), round(ys(visible)), side, textW) : null

    const labelW = labelWidth('Deadline →', DOMAIN_FONT)
    const labelY = c.y + DOMAIN_LABEL_DY
    const failedY = c.y + FAILED_DY
    domains[d] = {
      c, side, inward, slots, more, visible, moreCount,
      labelY, labelBox: textBox(c.x, 'middle', labelW, labelY, DOMAIN_FONT),
      failedY, failedBox: textBox(c.x, 'middle', labelWidth('불러오지 못했어요', FAILED_FONT), failedY, FAILED_FONT),
      hit: { x1: c.x - DOMAIN_HIT.half, x2: c.x + DOMAIN_HIT.half, y1: c.y + DOMAIN_HIT.top, y2: c.y + DOMAIN_HIT.bottom },
    }
  }

  const hubLabelY = hub.y + HUB_LABEL_DY
  const emptyY = hub.y + EMPTY_DY
  return {
    w: W, h: H, orientation, textW, hub,
    hubLabelY, hubLabelBox: textBox(hub.x, 'middle', labelWidth(HUB_LABEL, HUB_FONT), hubLabelY, HUB_FONT),
    emptyY, emptyBox: textBox(hub.x, 'middle', labelWidth(EMPTY_TEXT, EMPTY_FONT), emptyY, EMPTY_FONT),
    domains,
  }
}

// '같은 날' 문구: 라벨 반대편(허브 쪽) 옆, 두 줄 사이 높이
export function sameDayCaption(p: Pt, q: Pt, inward: 1 | -1) {
  const x = (inward > 0 ? Math.max(p.x, q.x) : Math.min(p.x, q.x)) + inward * 8
  const y = (p.y + q.y) / 2 + 4
  const anchor: 'start' | 'end' = inward > 0 ? 'start' : 'end'
  return { x, y, anchor, box: textBox(x, anchor, labelWidth(SAME_DAY_TEXT, CAPTION_FONT), y, CAPTION_FONT) }
}
