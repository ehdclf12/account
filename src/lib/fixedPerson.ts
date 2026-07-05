import type { FixedCost } from '@/types'

export function fixedByPerson(items: FixedCost[]): { husband: number; wife: number; shared: number } {
  const r = { husband: 0, wife: 0, shared: 0 }
  for (const f of items) {
    if (f.who === 'husband') r.husband += f.amount
    else if (f.who === 'wife') r.wife += f.amount
    else r.shared += f.amount
  }
  return r
}
