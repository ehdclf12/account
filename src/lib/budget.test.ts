import { describe, it, expect } from 'vitest'
import { spentByCategory, computeBudget } from './budget'
import type { Transaction } from '@/types'

const tx = (p: Partial<Transaction>): Transaction => ({
  id: 'x', who: 'husband', type: 'expense', amount: 0, category_id: null,
  payment_method_id: null, date: '2026-07-01', memo: '', created_at: '',
  scope: 'household', ...p,
})

describe('spentByCategory', () => {
  it('지출만 카테고리별 합산', () => {
    const m = spentByCategory([
      tx({ category_id: 'a', amount: 1000 }),
      tx({ category_id: 'a', amount: 500 }),
      tx({ category_id: 'b', amount: 200 }),
      tx({ type: 'income', category_id: 'a', amount: 9999 }),
    ])
    expect(m).toEqual({ a: 1500, b: 200 })
  })
})

describe('computeBudget', () => {
  it('예산 대비 지출·초과 계산', () => {
    const r = computeBudget(
      [{ category_id: 'a', amount: 40000 }, { category_id: 'b', amount: 10000 }, { category_id: 'c', amount: 0 }],
      { a: 32000, b: 15000 },
    )
    expect(r.totalBudget).toBe(50000)
    expect(r.totalSpent).toBe(47000)
    expect(r.lines.find((l) => l.category_id === 'b')).toEqual({ category_id: 'b', budget: 10000, spent: 15000, remaining: -5000, over: true })
    expect(r.lines.some((l) => l.category_id === 'c')).toBe(false) // amount 0 제외
  })
})
