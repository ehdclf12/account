import { describe, it, expect } from 'vitest'
import { recentMonths, monthlyExpense, categoryBreakdown } from './stats'
import type { Transaction } from '@/types'

const tx = (p: Partial<Transaction>): Transaction => ({
  id: 'x', who: 'husband', type: 'expense', amount: 0, category_id: null,
  payment_method_id: null, date: '2026-07-01', memo: '', created_at: '', scope: 'household', ...p,
})

describe('recentMonths', () => {
  it('연도 넘김 포함 최근 n개월(오름차순)', () => {
    expect(recentMonths(2026, 2, 3).map((m) => m.key)).toEqual(['2025-12', '2026-01', '2026-02'])
    expect(recentMonths(2026, 2, 3).map((m) => m.label)).toEqual(['12월', '1월', '2월'])
  })
})

describe('monthlyExpense', () => {
  it('월별 지출 합(수입 제외)', () => {
    const txs = [
      tx({ date: '2026-06-10', amount: 1000 }),
      tx({ date: '2026-07-05', amount: 2000 }),
      tx({ date: '2026-07-20', amount: 500 }),
      tx({ date: '2026-07-02', type: 'income', amount: 9999 }),
    ]
    expect(monthlyExpense(txs, ['2026-06', '2026-07'])).toEqual([1000, 2500])
  })
})

describe('categoryBreakdown', () => {
  it('해당 월 카테고리별 지출 내림차순+비율', () => {
    const txs = [
      tx({ date: '2026-07-01', category_id: 'a', amount: 3000 }),
      tx({ date: '2026-07-02', category_id: 'b', amount: 1000 }),
      tx({ date: '2026-06-01', category_id: 'a', amount: 5000 }),
    ]
    const r = categoryBreakdown(txs, '2026-07')
    expect(r.map((s) => s.category_id)).toEqual(['a', 'b'])
    expect(r[0].amount).toBe(3000)
    expect(r[0].pct).toBeCloseTo(0.75, 5)
  })
})
