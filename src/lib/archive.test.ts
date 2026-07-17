import { describe, it, expect } from 'vitest'
import {
  checklistProgress, normalizeUrl,
  buildFolderTree, sortItems, dueStatus, storagePathFromPublicUrl, moveItem,
} from './archive'
import type { ArchiveFolder, ArchiveItem } from '@/types'

const folder = (over: Partial<ArchiveFolder>): ArchiveFolder =>
  ({ id: '', name: '', sort_order: 0, parent_id: null, created_at: '', ...over })
const item = (over: Partial<ArchiveItem>): ArchiveItem =>
  ({ id: '', folder_id: null, kind: 'checklist', title: '', body: null, url: null,
     preview: null, checklist: null, pinned: false, due_date: null, color: null,
     archived: false, done: false, created_at: '', updated_at: '', ...over })

describe('checklistProgress', () => {
  it('완료/전체 개수를 센다', () => {
    expect(checklistProgress([{ text: 'a', done: true }, { text: 'b', done: false }])).toEqual({ done: 1, total: 2 })
  })
  it('null은 0/0', () => {
    expect(checklistProgress(null)).toEqual({ done: 0, total: 0 })
  })
})

describe('normalizeUrl', () => {
  it('스킴 없으면 https:// 를 붙인다', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com/')
  })
  it('공백/도트 없는 호스트는 null', () => {
    expect(normalizeUrl('   ')).toBeNull()
    expect(normalizeUrl('notaurl')).toBeNull()
  })
})

describe('buildFolderTree', () => {
  it('parent_id 기준 2단계 트리를 만든다', () => {
    const fs = [
      folder({ id: 'a', name: 'A' }),
      folder({ id: 'b', name: 'B' }),
      folder({ id: 'a1', name: 'A1', parent_id: 'a' }),
    ]
    const tree = buildFolderTree(fs)
    expect(tree.map((t) => t.id)).toEqual(['a', 'b'])
    expect(tree[0].children.map((c) => c.id)).toEqual(['a1'])
    expect(tree[1].children).toEqual([])
  })
})

describe('sortItems', () => {
  it('핀이 항상 먼저', () => {
    const a = item({ id: 'a', pinned: false, updated_at: '2026-01-02' })
    const b = item({ id: 'b', pinned: true, updated_at: '2026-01-01' })
    expect(sortItems([a, b], 'updated').map((x) => x.id)).toEqual(['b', 'a'])
  })
  it('updated는 최신순', () => {
    const a = item({ id: 'a', updated_at: '2026-01-01' })
    const b = item({ id: 'b', updated_at: '2026-01-03' })
    expect(sortItems([a, b], 'updated').map((x) => x.id)).toEqual(['b', 'a'])
  })
  it('name은 이름순', () => {
    const a = item({ id: 'a', title: '나' })
    const b = item({ id: 'b', title: '가' })
    expect(sortItems([a, b], 'name').map((x) => x.id)).toEqual(['b', 'a'])
  })
  it('due는 기한 있는 것 우선·임박순', () => {
    const a = item({ id: 'a', due_date: null, updated_at: '2026-01-05' })
    const b = item({ id: 'b', due_date: '2026-02-01' })
    const c = item({ id: 'c', due_date: '2026-01-10' })
    expect(sortItems([a, b, c], 'due').map((x) => x.id)).toEqual(['c', 'b', 'a'])
  })
})

describe('dueStatus', () => {
  it('과거는 overdue(음수 days)', () => {
    expect(dueStatus('2026-01-01', '2026-01-05')).toEqual({ kind: 'overdue', days: -4 })
  })
  it('같은 날은 today', () => {
    expect(dueStatus('2026-01-05', '2026-01-05')).toEqual({ kind: 'today', days: 0 })
  })
  it('미래는 upcoming(양수 days)', () => {
    expect(dueStatus('2026-01-08', '2026-01-05')).toEqual({ kind: 'upcoming', days: 3 })
  })
  it('null은 null', () => {
    expect(dueStatus(null, '2026-01-05')).toBeNull()
  })
})

describe('storagePathFromPublicUrl', () => {
  it('공개 URL에서 archive 이후 경로를 뽑는다', () => {
    expect(storagePathFromPublicUrl('https://x.supabase.co/storage/v1/object/public/archive/abc.jpg')).toBe('abc.jpg')
  })
  it('해당 마커 없으면 null', () => {
    expect(storagePathFromPublicUrl('https://x/other/abc.jpg')).toBeNull()
  })
})

describe('moveItem', () => {
  it('중간 원소를 앞으로 이동', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 2, 0)).toEqual(['c', 'a', 'b', 'd'])
  })
  it('앞 원소를 뒤로 이동', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
  })
  it('같은 인덱스는 그대로', () => {
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c'])
  })
  it('범위 밖은 원본 복사본', () => {
    expect(moveItem(['a', 'b'], 5, 0)).toEqual(['a', 'b'])
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b'])
  })
  it('원본을 변형하지 않는다', () => {
    const src = ['a', 'b', 'c']
    moveItem(src, 0, 2)
    expect(src).toEqual(['a', 'b', 'c'])
  })
})
