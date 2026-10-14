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

// 라벨 글자 폭 어림. 한글·한자·이모지·기호(U+2000 이상)는 대체 글꼴에서 거의 1em, 나머지 고정폭은 0.6em.
export function labelWidth(text: string, fontSize: number): number {
  let em = 0
  for (const ch of text) em += ch.codePointAt(0)! >= 0x2000 ? 1 : 0.6
  return em * fontSize
}

// 항목 라벨(제목 한 줄 + 부제 한 줄)의 글자 크기와 노드 중심 기준 기준선 위치
export const LABEL = { size: 6, subSize: 5.4, dy: -1, subDy: 6, gap: 5 } as const
// 한 칸 높이: 제목 위끝(dy - 0.8em)부터 부제 아래끝(subDy + 0.2em)까지 ≈ 12.9 → 위아래 이웃과 안 겹치게 14.5 간격
const PITCH = 14.5

// 영역 노드에서 허브 반대쪽(위쪽 영역은 위, 아래쪽 영역은 아래)으로 항목을 한 줄씩 쌓는다.
// 라벨은 화면 바깥쪽(왼쪽 영역은 왼쪽, 오른쪽 영역은 오른쪽)으로 붙이므로, 위아래 간격만 지키면 라벨끼리 겹치지 않는다.
// 노드는 멀어질수록 허브 쪽으로 조금씩 기울어 호를 이루고, 연결선이 다른 라벨을 가로지르지 않는다.
export function arcPositions(center: Pt, n: number, pitch = PITCH): Pt[] {
  if (n <= 0) return []
  const v = center.y < HUB.y ? -1 : 1 // 허브 반대쪽 세로 방향
  const inward = center.x < HUB.x ? 1 : -1 // 허브 쪽 가로 방향
  // 아래쪽 영역은 영역 이름과 실패 문구(아래쪽에 적힘)를 비켜 조금 더 떨어져 시작한다
  const first = v < 0 ? 18 : 32
  return Array.from({ length: n }, (_, k) => ({
    x: clamp(round(center.x + inward * (2 + 3 * k)), 14, VIEW.w - 14),
    y: clamp(round(center.y + v * (first + pitch * k)), 28, VIEW.h - 14),
  }))
}

// 라벨을 노드의 바깥쪽 옆에 붙인다. 화면 끝을 넘으면 안쪽으로 밀어 [2, 238] 안에 둔다.
export function labelPlacement(center: Pt, p: Pt, width: number): { x: number; anchor: 'start' | 'end' } {
  if (center.x < HUB.x) {
    return { x: Math.ceil(Math.max(p.x - LABEL.gap, 2 + width) * 10) / 10, anchor: 'end' }
  }
  return { x: Math.floor(Math.min(p.x + LABEL.gap, VIEW.w - 2 - width) * 10) / 10, anchor: 'start' }
}
