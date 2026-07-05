import { describe, it, expect } from 'vitest'
import { hashPin } from './pin'

describe('hashPin', () => {
  it('동일 입력 동일 해시, 64자 hex', async () => {
    const a = await hashPin('1234')
    const b = await hashPin('1234')
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(await hashPin('0000')).not.toBe(a)
  })
})
