import { describe, it, expect, beforeEach } from 'vitest'
import { loadTheme, saveTheme } from './theme'

describe('loadTheme', () => {
  beforeEach(() => localStorage.clear())

  it('저장된 값이 없으면 light', () => {
    expect(loadTheme()).toBe('light')
  })
  it('dark가 저장돼 있으면 dark', () => {
    localStorage.setItem('theme', 'dark')
    expect(loadTheme()).toBe('dark')
  })
  it('light가 저장돼 있으면 light', () => {
    localStorage.setItem('theme', 'light')
    expect(loadTheme()).toBe('light')
  })
  it('이상한 값이면 light로 폴백한다 — 정규화 안 하면 data-theme에 쓰레기가 꽂혀 앱이 무색으로 뜬다', () => {
    localStorage.setItem('theme', 'blue')
    expect(loadTheme()).toBe('light')
  })
})

describe('saveTheme', () => {
  beforeEach(() => localStorage.clear())

  it('저장한 값을 다시 읽을 수 있다', () => {
    saveTheme('dark')
    expect(loadTheme()).toBe('dark')
    saveTheme('light')
    expect(loadTheme()).toBe('light')
  })
})
