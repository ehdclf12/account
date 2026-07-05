import { describe, it, expect } from 'vitest'
import { fixedByPerson } from './fixedPerson'
import type { FixedCost } from '@/types'

const fc = (amount: number, who: FixedCost['who']): FixedCost => ({
  id: Math.random().toString(), scope: 'household', name: 'x', amount,
  category_id: null, day: 1, active: true, who,
})

describe('fixedByPerson', () => {
  it('담당자별 합계(공동은 who null)', () => {
    const r = fixedByPerson([fc(1000, 'husband'), fc(2000, 'wife'), fc(500, 'husband'), fc(300, null)])
    expect(r).toEqual({ husband: 1500, wife: 2000, shared: 300 })
  })
})
