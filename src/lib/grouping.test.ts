import { describe, it, expect } from 'vitest'
import { groupByDate } from './grouping'
import type { Transaction } from '@/types'

const tx = (id: string, date: string): Transaction => ({
  id, who: 'husband', type: 'expense', amount: 100,
  category_id: null, payment_method_id: null, date, memo: '', created_at: '',
})

describe('groupByDate', () => {
  it('날짜별 묶고 내림차순', () => {
    const g = groupByDate([tx('a','2026-07-01'), tx('b','2026-07-05'), tx('c','2026-07-01')])
    expect(g.map(x => x.date)).toEqual(['2026-07-05', '2026-07-01'])
    expect(g[1].items.map(i => i.id)).toEqual(['a', 'c'])
  })
})
