import type { ArchiveColor, ArchiveFolder, ArchiveItem, ChecklistEntry, SortMode } from '@/types'

export function checklistProgress(
  items: ChecklistEntry[] | null | undefined,
): { done: number; total: number } {
  const list = items ?? []
  return { done: list.filter((i) => i.done).length, total: list.length }
}

export function normalizeUrl(input: string): string | null {
  const t = input.trim()
  if (!t) return null
  const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`
  try {
    const u = new URL(withScheme)
    if (!u.hostname.includes('.')) return null
    return u.toString()
  } catch {
    return null
  }
}

export interface FolderNode extends ArchiveFolder {
  children: ArchiveFolder[]
}

export function buildFolderTree(folders: ArchiveFolder[]): FolderNode[] {
  const tops = folders.filter((f) => !f.parent_id)
  return tops.map((t) => ({
    ...t,
    children: folders.filter((f) => f.parent_id === t.id),
  }))
}

export function sortItems(items: ArchiveItem[], mode: SortMode): ArchiveItem[] {
  const cmp = (a: ArchiveItem, b: ArchiveItem): number => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    switch (mode) {
      case 'name':
        return a.title.localeCompare(b.title)
      case 'created':
        return b.created_at.localeCompare(a.created_at)
      case 'due':
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
        if (a.due_date) return -1
        if (b.due_date) return 1
        return b.updated_at.localeCompare(a.updated_at)
      case 'updated':
      default:
        return b.updated_at.localeCompare(a.updated_at)
    }
  }
  return [...items].sort(cmp)
}

export function dueStatus(
  due: string | null,
  todayISO: string,
): { kind: 'overdue' | 'today' | 'upcoming'; days: number } | null {
  if (!due) return null
  const d = new Date(due + 'T00:00:00')
  const t = new Date(todayISO + 'T00:00:00')
  const days = Math.round((d.getTime() - t.getTime()) / 86400000)
  if (days < 0) return { kind: 'overdue', days }
  if (days === 0) return { kind: 'today', days: 0 }
  return { kind: 'upcoming', days }
}

export function storagePathFromPublicUrl(url: string): string | null {
  const marker = '/storage/v1/object/public/archive/'
  const i = url.indexOf(marker)
  if (i === -1) return null
  return url.slice(i + marker.length) || null
}

export const ARCHIVE_COLORS: { key: ArchiveColor; hex: string }[] = [
  { key: 'red', hex: '#F04452' },
  { key: 'orange', hex: '#FF9500' },
  { key: 'green', hex: '#22C55E' },
  { key: 'blue', hex: '#3182F6' },
  { key: 'purple', hex: '#8B5CF6' },
]

// 캐시에 들어있는 전체 목록을 입력으로 받아 토글 결과를 새 배열로 돌려준다.
// 렌더 시점 스냅샷이 아니라 "현재 캐시"를 기준으로 누적시키기 위한 형태 —
// 연속 탭에서 앞선 체크가 되돌아가는 갱신 유실을 막는다.
export function applyChecklistToggle(
  items: ArchiveItem[],
  itemId: string,
  index: number,
): ArchiveItem[] {
  return items.map((it) => {
    if (it.id !== itemId || !it.checklist || index < 0 || index >= it.checklist.length) return it
    return {
      ...it,
      checklist: it.checklist.map((c, i) => (i === index ? { ...c, done: !c.done } : c)),
    }
  })
}

export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const copy = [...arr]
  if (from < 0 || from >= copy.length || to < 0 || to >= copy.length || from === to) return copy
  const [x] = copy.splice(from, 1)
  copy.splice(to, 0, x)
  return copy
}
