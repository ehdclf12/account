import type { SessionStatus } from '@/engine/workout/today'

export const STATUS_LABEL: Record<SessionStatus, string> = {
  todo: '시작 전', in_progress: '진행 중', done: '✅ 완료',
}

export const fmtKg = (n: number) => String(Math.round(n * 100) / 100)

/** 0.5kg 단위로 맞춘 무게. 빈 값·잘못된 값은 null. */
export function parseWeight(v: string): number | null {
  const n = parseFloat(v.replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 2) / 2
}

/** 0 이상 정수 횟수. 빈 값·잘못된 값은 fallback. */
export function parseReps(v: string, fallback: number): number {
  const n = parseInt(v, 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const w = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()]
  return `${y}.${m}.${d} (${w})`
}
