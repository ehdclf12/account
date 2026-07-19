import { describe, it, expect } from 'vitest'
import { effectiveAmount, isLivePriced } from './quote'

const aapl = { amount: 900000, symbol: 'AAPL', quantity: 10 }
const samsung = { amount: 0, symbol: '005930.KS', quantity: 20 }

describe('isLivePriced', () => {
  it('USD 시세+환율 있으면 true', () => {
    expect(isLivePriced(aapl, { price: 195.2, currency: 'USD' }, 1380)).toBe(true)
  })
  it('USD인데 환율 없으면 false', () => {
    expect(isLivePriced(aapl, { price: 195.2, currency: 'USD' }, null)).toBe(false)
  })
  it('KRW 시세면 환율 없어도 true', () => {
    expect(isLivePriced(samsung, { price: 74000, currency: 'KRW' }, null)).toBe(true)
  })
  it('심볼/수량/시세 없으면 false', () => {
    expect(isLivePriced({ symbol: null, quantity: null }, undefined, 1380)).toBe(false)
    expect(isLivePriced(aapl, undefined, 1380)).toBe(false)
    expect(isLivePriced({ symbol: 'AAPL', quantity: null }, { price: 1, currency: 'USD' }, 1380)).toBe(false)
    expect(isLivePriced(aapl, { price: 0, currency: 'USD' }, 1380)).toBe(false)
  })
})

describe('effectiveAmount', () => {
  it('USD는 환율로 환산', () => {
    expect(effectiveAmount(aapl, { price: 195.2, currency: 'USD' }, 1380)).toBe(2693760)
  })
  it('KRW는 그대로', () => {
    expect(effectiveAmount(samsung, { price: 74000, currency: 'KRW' }, 1380)).toBe(1480000)
  })
  it('심볼 없으면 수동 amount 폴백', () => {
    expect(effectiveAmount({ amount: 5000000, symbol: null, quantity: null }, undefined, 1380)).toBe(5000000)
  })
  it('시세 못 받으면 수동 amount 폴백', () => {
    expect(effectiveAmount(aapl, undefined, 1380)).toBe(900000)
  })
  it('USD인데 환율 없으면 폴백', () => {
    expect(effectiveAmount(aapl, { price: 195.2, currency: 'USD' }, null)).toBe(900000)
  })
  it('price 0이면 폴백', () => {
    expect(effectiveAmount(aapl, { price: 0, currency: 'USD' }, 1380)).toBe(900000)
  })
  it('수량 0이면 수동 amount 폴백(0으로 지우지 않는다)', () => {
    const zeroQty = { amount: 5000000, symbol: 'AAPL', quantity: 0 }
    expect(isLivePriced(zeroQty, { price: 250, currency: 'USD' }, 1400)).toBe(false)
    expect(effectiveAmount(zeroQty, { price: 250, currency: 'USD' }, 1400)).toBe(5000000)
  })
})
