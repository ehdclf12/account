import { describe, it, expect } from 'vitest'
import { checklistProgress, normalizeUrl, countByFolder } from './archive'
import type { ArchiveItem } from '@/types'

describe('checklistProgress', () => {
  it('완료/전체 개수를 센다', () => {
    expect(checklistProgress([
      { text: 'a', done: true },
      { text: 'b', done: false },
      { text: 'c', done: true },
    ])).toEqual({ done: 2, total: 3 })
  })
  it('null/undefined/빈배열은 0/0', () => {
    expect(checklistProgress(null)).toEqual({ done: 0, total: 0 })
    expect(checklistProgress(undefined)).toEqual({ done: 0, total: 0 })
    expect(checklistProgress([])).toEqual({ done: 0, total: 0 })
  })
})

describe('normalizeUrl', () => {
  it('스킴 없으면 https:// 를 붙인다', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com/')
  })
  it('기존 스킴은 유지한다', () => {
    expect(normalizeUrl('http://a.com/x?q=1')).toBe('http://a.com/x?q=1')
  })
  it('공백/도트 없는 호스트는 null', () => {
    expect(normalizeUrl('   ')).toBeNull()
    expect(normalizeUrl('notaurl')).toBeNull()
  })
})

describe('countByFolder', () => {
  it('folder_id로 묶고 null은 none', () => {
    const items = [
      { folder_id: 'f1' }, { folder_id: 'f1' }, { folder_id: null },
    ] as ArchiveItem[]
    expect(countByFolder(items)).toEqual({ f1: 2, none: 1 })
  })
})
