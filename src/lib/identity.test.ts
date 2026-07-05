import { describe, it, expect, beforeEach } from 'vitest'
import { getIdentity, setIdentity, isPinOk, setPinOk } from './identity'

beforeEach(() => localStorage.clear())

describe('identity storage', () => {
  it('정체성 저장/조회', () => {
    expect(getIdentity()).toBeNull()
    setIdentity('wife')
    expect(getIdentity()).toBe('wife')
  })
  it('PIN 상태', () => {
    expect(isPinOk()).toBe(false)
    setPinOk(true)
    expect(isPinOk()).toBe(true)
  })
})
