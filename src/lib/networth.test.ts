import { describe, it, expect } from 'vitest'
import { assetSign, computeNetWorth } from './networth'

describe('assetSign', () => {
  it('부채는 -1', () => {
    expect(assetSign('liability')).toBe(-1)
  })
  it('그 외 자산은 +1', () => {
    expect(assetSign('stock_us')).toBe(1)
    expect(assetSign('crypto')).toBe(1)
    expect(assetSign('real_estate')).toBe(1)
  })
})

describe('computeNetWorth', () => {
  it('자산만 합산 + 저축', () => {
    const rows = [
      { type: 'stock_us', amount: 18000000 },
      { type: 'crypto', amount: 4300000 },
    ]
    const r = computeNetWorth(rows, 30000000)
    expect(r.total).toBe(52300000)
    expect(r.byType).toEqual({ stock_us: 18000000, crypto: 4300000, savings: 30000000 })
  })
  it('부채는 차감', () => {
    const rows = [
      { type: 'real_estate', amount: 62300000 },
      { type: 'liability', amount: 10000000 },
    ]
    const r = computeNetWorth(rows, 0)
    expect(r.total).toBe(52300000)
    expect(r.byType).toEqual({ real_estate: 62300000, liability: 10000000, savings: 0 })
  })
  it('같은 타입은 누적 합산', () => {
    const rows = [
      { type: 'cash', amount: 1000000 },
      { type: 'cash', amount: 500000 },
    ]
    const r = computeNetWorth(rows, 0)
    expect(r.total).toBe(1500000)
    expect(r.byType.cash).toBe(1500000)
  })
  it('빈 자산 + 저축 0 → total 0', () => {
    const r = computeNetWorth([], 0)
    expect(r.total).toBe(0)
    expect(r.byType).toEqual({ savings: 0 })
  })
})
