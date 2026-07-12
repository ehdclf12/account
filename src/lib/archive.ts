import type { ArchiveItem, ChecklistEntry } from '@/types'

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

export function countByFolder(items: ArchiveItem[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const it of items) {
    const key = it.folder_id ?? 'none'
    out[key] = (out[key] ?? 0) + 1
  }
  return out
}
