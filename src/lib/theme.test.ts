import { describe, it, expect, beforeEach } from 'vitest'
import { applyTheme } from './theme'

describe('applyTheme', () => {
  beforeEach(() => {
    document.head.innerHTML = '<meta name="theme-color" content="#FFFFFF">'
    delete document.documentElement.dataset.theme
  })

  it('html에 data-theme을 단다', () => {
    applyTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
  it('상태바 색을 다크 배경색으로 바꾼다', () => {
    applyTheme('dark')
    expect(document.querySelector('meta[name="theme-color"]')!.getAttribute('content')).toBe('#17171C')
  })
})
