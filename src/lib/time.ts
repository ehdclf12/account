import type { TimeSession } from '@/types'

/** 세션의 경과 초. 진행 중(ended_at null)이면 now 기준으로 계산한다. */
export function elapsedSeconds(session: TimeSession, nowMs: number): number {
  const start = new Date(session.started_at).getTime()
  const end = session.ended_at ? new Date(session.ended_at).getTime() : nowMs
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0
  // 시계 오차나 이상값으로 음수가 나오는 것을 막는다
  return Math.max(0, Math.floor((end - start) / 1000))
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  if (s === 0) return '0분'
  if (s < 60) return `${s}초`
  const mins = Math.floor(s / 60)
  if (mins < 60) return `${mins}분`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`
}

export function totalsByBlock(list: TimeSession[], nowMs: number): Record<string, number> {
  const out: Record<string, number> = {}
  for (const s of list) {
    out[s.block_id] = (out[s.block_id] ?? 0) + elapsedSeconds(s, nowMs)
  }
  return out
}

/** 'YYYY-MM-DD'가 속한 주의 월요일. 기존 캘린더와 같은 월요일 시작. */
export function weekStartISO(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  const offset = (d.getDay() + 6) % 7 // 일=0인 getDay()를 월=0으로 옮긴다
  d.setDate(d.getDate() - offset)
  return localISO(d)
}

/**
 * [from, toExclusive) 구간의 합계.
 * 자정을 넘긴 세션은 쪼개지 않고 **시작일**에 몰아서 잡는다(예측 가능성 우선).
 */
export function sumInRange(
  list: TimeSession[],
  fromISO: string,
  toExclusiveISO: string,
  nowMs: number,
): number {
  let total = 0
  for (const s of list) {
    const day = localISO(new Date(s.started_at))
    if (day >= fromISO && day < toExclusiveISO) total += elapsedSeconds(s, nowMs)
  }
  return total
}

function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
