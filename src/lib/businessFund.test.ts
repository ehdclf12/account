import { describe, it, expect } from 'vitest'
import { computeFundBalance } from './businessFund'
import type { Transaction } from '@/types'

const tx = (p: Partial<Transaction>): Transaction => ({
  id: 'x', who: 'husband', type: 'expense', amount: 0, category_id: null,
  payment_method_id: null, date: '2026-07-01', memo: '', created_at: '',
  scope: 'household', ...p,
})

describe('computeFundBalance', () => {
  it('이체 유입 - 역이체 유출 + 사업수입 - 사업지출', () => {
    const transfers = [
      tx({ type: 'expense', amount: 500000 }), // 가계→사업 보내기 (유입)
      tx({ type: 'income', amount: 100000 }),  // 사업→가계 받기 (유출)
    ]
    const biz = [
      tx({ scope: 'business', type: 'income', amount: 800000 }),
      tx({ scope: 'business', type: 'expense', amount: 200000 }),
    ]
    expect(computeFundBalance(transfers, biz)).toBe(1000000) // 500-100+800-200=1000
  })
  it('빈 입력은 0', () => {
    expect(computeFundBalance([], [])).toBe(0)
  })
})
