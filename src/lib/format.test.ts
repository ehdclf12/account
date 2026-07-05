import { describe, it, expect } from 'vitest'
import { formatKRW } from './format'

describe('formatKRW', () => {
  it('천단위 콤마와 ₩', () => {
    expect(formatKRW(5600)).toBe('₩5,600')
    expect(formatKRW(3000000)).toBe('₩3,000,000')
    expect(formatKRW(0)).toBe('₩0')
  })
})
