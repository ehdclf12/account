import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { showToast, subscribeToasts, getToasts, _resetToasts } from './toast'

beforeEach(() => { _resetToasts(); vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('toast', () => {
  it('메시지를 추가하고 구독자에게 알린다', () => {
    const seen: string[][] = []
    subscribeToasts(() => seen.push(getToasts().map((t) => t.text)))
    showToast('저장 실패')
    expect(getToasts().map((t) => t.text)).toEqual(['저장 실패'])
    expect(seen).toEqual([['저장 실패']])
  })

  it('일정 시간 뒤 자동으로 사라진다', () => {
    showToast('사라질 메시지')
    expect(getToasts()).toHaveLength(1)
    vi.advanceTimersByTime(5000)
    expect(getToasts()).toHaveLength(0)
  })

  it('같은 메시지가 연속으로 오면 쌓지 않는다', () => {
    showToast('네트워크 연결을 확인해 주세요.')
    showToast('네트워크 연결을 확인해 주세요.')
    expect(getToasts()).toHaveLength(1)
  })

  it('구독 해제 후에는 알림을 받지 않는다', () => {
    let count = 0
    const off = subscribeToasts(() => { count++ })
    showToast('a')
    off()
    showToast('b')
    expect(count).toBe(1)
  })
})
