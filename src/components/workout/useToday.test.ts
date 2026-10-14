import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useToday } from './useToday'

afterEach(() => { vi.useRealTimers() })

describe('useToday', () => {
  it('자정을 넘기면 1분 안에 날짜가 바뀐다', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 13, 23, 59, 30))
    const { result } = renderHook(() => useToday())
    expect(result.current).toBe('2026-10-13')
    act(() => { vi.advanceTimersByTime(60_000) })
    expect(result.current).toBe('2026-10-14')
  })

  it('화면으로 돌아오면(visible) 다시 계산하고, 언마운트하면 정리한다', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 13, 9, 0, 0))
    const remove = vi.spyOn(document, 'removeEventListener')
    const { result, unmount } = renderHook(() => useToday())
    vi.setSystemTime(new Date(2026, 9, 15, 8, 0, 0))
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(result.current).toBe('2026-10-15')
    unmount()
    expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    expect(vi.getTimerCount()).toBe(0)
    remove.mockRestore()
  })
})
