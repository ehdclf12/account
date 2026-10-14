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
