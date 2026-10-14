import { describe, it, expect } from 'vitest'
import { DOMAINS } from './dashboard'
import { VIEW, HUB, DOMAIN_POS, mulberry32, makeDust, arcPositions, labelWidth, labelPlacement, LABEL } from './nebula'

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

describe('labelWidth', () => {
  it('한글·이모지는 1em, 나머지는 0.6em', () => {
    expect(labelWidth('가나', 6)).toBeCloseTo(12)
    expect(labelWidth('ab', 10)).toBeCloseTo(12)
    expect(labelWidth('📌 가', 10)).toBeCloseTo(26)
  })
})

describe('arcPositions', () => {
  it('0개면 빈 배열', () => {
    expect(arcPositions(DOMAIN_POS.deadline, 0)).toEqual([])
  })
  // 라벨이 서로 안 겹치는지는 아래 테스트가 본다. 노드 사이 거리는 탭 영역이 너무 붙지 않을 만큼만 확인한다.
  it('모든 영역에서 1~6개가 서로 14 이상 떨어지고 화면 안에 있다', () => {
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
          expect(Math.hypot(ps[i].x - ps[j].x, ps[i].y - ps[j].y)).toBeGreaterThanOrEqual(14)
        }
      }
    }
  })
  it('8글자 한글 라벨과 부제가 이웃 노드와 겹치지 않고 화면 밖으로 나가지 않는다', () => {
    const label = '가나다라마바사아', sub = '자차카타파'
    type Box = { x1: number; x2: number; y1: number; y2: number }
    const boxOf = (x: number, anchor: 'start' | 'end', w: number, baseline: number, fs: number): Box => ({
      x1: anchor === 'start' ? x : x - w, x2: anchor === 'start' ? x + w : x,
      y1: baseline - fs * 0.8, y2: baseline + fs * 0.2,
    })
    const hit = (a: Box, b: Box) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2
    for (const d of DOMAINS) {
      const c = DOMAIN_POS[d]
      for (let n = 1; n <= 6; n++) {
        const boxes = arcPositions(c, n).map((p) => {
          const lw = labelWidth(label, LABEL.size), sw = labelWidth(sub, LABEL.subSize)
          const { x, anchor } = labelPlacement(c, p, Math.max(lw, sw))
          return [
            boxOf(x, anchor, lw, p.y + LABEL.dy, LABEL.size),
            boxOf(x, anchor, sw, p.y + LABEL.subDy, LABEL.subSize),
          ]
        })
        for (const b of boxes.flat()) {
          expect(b.x1).toBeGreaterThanOrEqual(2)
          expect(b.x2).toBeLessThanOrEqual(VIEW.w - 2)
          expect(b.y1).toBeGreaterThanOrEqual(0)
          expect(b.y2).toBeLessThanOrEqual(VIEW.h)
        }
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
          for (const a of boxes[i]) for (const b of boxes[j]) expect(hit(a, b), `${d} n=${n} ${i}-${j}`).toBe(false)
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
