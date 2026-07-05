import { describe, it, expect } from 'vitest'
import { computeSummary } from './summary'
import type { Transaction } from '@/types'

const tx = (p: Partial<Transaction>): Transaction => ({
  id: '1', who: 'husband', type: 'expense', amount: 0,
  category_id: null, payment_method_id: null, date: '2026-07-01',
  memo: '', created_at: '', ...p,
})

describe('computeSummary', () => {
  it('수입-지출=남은돈', () => {
    const r = computeSummary([
      tx({ type: 'income', amount: 3000000 }),
      tx({ type: 'expense', amount: 5600 }),
      tx({ type: 'expense', amount: 12000 }),
    ])
    expect(r.income).toBe(3000000)
    expect(r.expense).toBe(17600)
    expect(r.remaining).toBe(2982400)
  })
  it('빈 배열은 0', () => {
    expect(computeSummary([])).toEqual({ income: 0, expense: 0, remaining: 0 })
  })
})
