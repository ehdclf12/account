// 한국 공휴일 프록시. GET /api/holidays?year=2026
// 공공데이터포털 특일정보를 조회해 { "YYYY-MM-DD": "이름" } 으로 반환한다.
//
// 서비스키는 서버에만 둔다(VITE_ 접두를 붙이면 클라이언트 번들에 실린다).
// data.go.kr은 인코딩/디코딩 두 버전의 키를 주는데, 디코딩된 키를 환경변수에
// 넣고 URLSearchParams가 인코딩하게 한다. 인코딩된 키를 또 인코딩하면 401.

import { normalizeHolidays } from './_holidays.js'

const ENDPOINT = 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo'
const TIMEOUT_MS = 8000

export default async function handler(req, res) {
  const year = Number((req.query && req.query.year) || 0)
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    res.status(400).json({ error: 'bad year' })
    return
  }

  const key = process.env.DATA_GO_KR_SERVICE_KEY
  // 키가 없어도 앱은 정상 동작해야 한다 — 공휴일만 안 보인다.
  if (!key) {
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({})
    return
  }

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS)
  try {
    const qs = new URLSearchParams({
      serviceKey: key,
      solYear: String(year),
      numOfRows: '100', // 기본값 10이라 지정하지 않으면 한 해 공휴일이 잘린다
      _type: 'json',
    })
    const r = await fetch(`${ENDPOINT}?${qs}`, { signal: ac.signal })
    // 오류 시 XML/HTML이 오기도 해서 파싱 실패를 그대로 흘리지 않는다
    const text = await r.text()
    let json = null
    try { json = JSON.parse(text) } catch { json = null }

    const holidays = normalizeHolidays(json)

    // 공휴일은 확정되면 바뀌지 않는다. 빈 결과는 일시적 장애일 수 있으니 짧게 잡는다.
    res.setHeader(
      'Cache-Control',
      Object.keys(holidays).length > 0
        ? 's-maxage=86400, stale-while-revalidate=604800'
        : 'no-store',
    )
    res.status(200).json(holidays)
  } catch {
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({})
  } finally {
    clearTimeout(timer)
  }
}
