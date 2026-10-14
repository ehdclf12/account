// 대시보드 노드 → 각 화면으로 '그 항목/날짜가 열린 채' 들어가기 위한 주소 규칙.
// 주소는 사용자가 직접 고칠 수도 있으므로 화면은 반드시 이 파서를 거쳐 읽는다.

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const ITEM_RE = /^[0-9A-Za-z-]{1,64}$/

export function parseDateParam(v: string | null): string | null {
  if (!v) return null
  const m = DATE_RE.exec(v)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const dt = new Date(y, mo - 1, d)
  // 왕복 비교: 2026-02-30 → 3월 2일로 넘어가면 다른 날짜이므로 버린다
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return v
}

export function parseItemParam(v: string | null): string | null {
  if (v == null) return null
  const t = v.trim()
  return ITEM_RE.test(t) ? t : null
}

export function archiveItemHref(id: string): string {
  return `/archive?item=${encodeURIComponent(id)}`
}

export function calendarDateHref(iso: string): string {
  return `/calendar?date=${iso}`
}
