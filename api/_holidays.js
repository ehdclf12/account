// 공공데이터포털 특일정보(getRestDeInfo) 응답을 { "YYYY-MM-DD": "이름" } 으로 정규화.
//
// 실제 응답에서 확인한 것들:
//  - locdate는 문자열이 아니라 숫자(20260101)
//  - 결과가 1건이면 items.item이 배열이 아니라 단일 객체로 오기도 한다
//  - 결과가 없으면 items가 빈 문자열('')로 온다
//  - 오류 시 JSON이 아니라 XML/HTML이 오는 경우가 있어 통째로 방어한다

export function normalizeHolidays(json) {
  const res = json && typeof json === 'object' ? json.response : null
  if (!res || typeof res !== 'object') return {}

  // resultCode '00'(NORMAL SERVICE)이 아니면 신뢰하지 않는다
  if (res.header && res.header.resultCode !== '00') return {}

  const items = res.body && res.body.items
  if (!items || typeof items !== 'object') return {}

  const list = [].concat(items.item ?? [])
  const out = {}

  for (const it of list) {
    if (!it || typeof it !== 'object') continue
    if (it.isHoliday !== 'Y') continue

    const iso = isoFromLocdate(it.locdate)
    if (!iso) continue

    // 같은 날짜에 여러 건이면 첫 번째 이름을 남긴다
    if (out[iso] === undefined) out[iso] = String(it.dateName ?? '').trim() || '공휴일'
  }

  return out
}

function isoFromLocdate(locdate) {
  const s = String(locdate ?? '')
  if (!/^\d{8}$/.test(s)) return null
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}
