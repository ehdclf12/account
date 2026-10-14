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
