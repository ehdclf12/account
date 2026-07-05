import { describe, it, expect } from 'vitest'
import { calcMargin, recommendPrice } from './margin'

describe('calcMargin', () => {
  it('부대비용·수량 반영 이익/마진율/원가율/총이익', () => {
    const r = calcMargin(10000, 6000, 500, 3)
    expect(r.unitCost).toBe(6500)
    expect(r.unitProfit).toBe(3500)
    expect(r.marginRate).toBeCloseTo(0.35, 5)
    expect(r.costRate).toBeCloseTo(0.65, 5)
    expect(r.totalProfit).toBe(10500)
    expect(r.totalRevenue).toBe(30000)
  })
  it('판매가 0이면 비율 0', () => {
    const r = calcMargin(0, 5000, 0, 1)
    expect(r.marginRate).toBe(0)
    expect(r.costRate).toBe(0)
  })
})

describe('recommendPrice', () => {
  it('원가+부대비용, 목표 마진율로 권장 판매가 역산', () => {
    // 총원가 6500, 목표 마진율 40% → 6500/(1-0.4)=10833.33 → 반올림 10833
    expect(recommendPrice(6000, 500, 0.4)).toBe(10833)
  })
  it('목표 마진율 100% 이상은 0(무효)', () => {
    expect(recommendPrice(6000, 500, 1)).toBe(0)
  })
})
