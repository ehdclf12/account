// Yahoo Finance 시세 프록시. GET /api/quotes?symbols=005930.KS,AAPL,BTC-USD
// 각 심볼 + USDKRW=X 를 Yahoo v8 chart로 조회(키 불필요). 부분 실패 허용.

async function fetchQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!r.ok) throw new Error(`yahoo ${r.status}`)
  const j = await r.json()
  const meta = j && j.chart && j.chart.result && j.chart.result[0] && j.chart.result[0].meta
  if (!meta || typeof meta.regularMarketPrice !== 'number') throw new Error('no price')
  return { price: meta.regularMarketPrice, currency: meta.currency || 'USD' }
}

// 한 요청이 야후로 만들 수 있는 동시 요청 수 상한.
// 없으면 콤마 5,000개짜리 요청 하나로 5,000건이 나가 함수가 타임아웃되고
// 배포본이 야후에서 차단당할 수 있다.
const MAX_SYMBOLS = 50

export default async function handler(req, res) {
  const raw = (req.query && req.query.symbols ? req.query.symbols : '').toString()
  const symbols = [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))].slice(0, MAX_SYMBOLS)
  const quotes = {}
  let usdkrw = null
  await Promise.all([
    ...symbols.map(async (sym) => {
      try { quotes[sym] = await fetchQuote(sym) } catch { /* 부분 실패 무시 */ }
    }),
    (async () => {
      try { usdkrw = (await fetchQuote('USDKRW=X')).price } catch { usdkrw = null }
    })(),
  ])
  res.setHeader('Cache-Control', 's-maxage=60')
  res.status(200).json({ quotes, usdkrw })
}
