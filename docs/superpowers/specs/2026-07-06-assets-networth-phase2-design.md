# 자산 현황 (⑥) 2단계 — 실시간 시세 설계서

작성일: 2026-07-06
로드맵: ⑥ 자산 현황 2단계(6-2). 1단계(6-1, 수동 평가액)는 완료·배포됨.
선행: 6-1 (assets 테이블 + symbol/quantity 예약 컬럼 + computeNetWorth + AssetsScreen/HubScreen).

## 목적

주식·코인 자산을 **보유수량 × 실시간 시세**로 자동 평가한다. 6-1에서 예약해 둔
`assets.symbol`·`assets.quantity`를 사용하고, 시세는 Vercel 서버리스 함수가 Yahoo
Finance를 대신 호출해 가져온다(API 키 불필요, CORS 회피). 시세를 못 받은 자산은
조용히 기존 수동 `amount`로 폴백한다.

## 범위 결정 (확정)

- **시세 소스**: Yahoo Finance v8 chart 엔드포인트(키 없이 안정적), 서버리스 프록시 경유.
- **심볼 입력**: 사용자가 Yahoo 티커를 직접 입력(예: `005930.KS`, `AAPL`, `BTC-USD`). 자동조합 없음.
- **환전**: Yahoo가 돌려주는 통화(currency)를 기준으로 처리. USD면 `USDKRW=X` 환율로 환산, KRW면 그대로.
- **갱신**: 화면 열 때 자동 + 수동 "새로고침" 버튼. 웹소켓/스트리밍 없음.
- **폴백**: 시세 실패/부분실패 시 해당 자산은 조용히 수동 `amount` 표시(별도 "시세 없음" 표기 없음). 시세로 계산된 항목만 작은 "시세" 배지.
- **범위 밖(YAGNI)**: 시세 DB 저장, 과거 시세 그래프, 자동조합 심볼, Upbit 등 별도 거래소, 웹소켓.

## 아키텍처

```
AssetSheet(심볼·수량 입력) ──> assets 테이블(symbol, quantity)
AssetsScreen / HubScreen
   ├─ useAssets() ─────────> 자산 목록
   ├─ useQuotes(symbols) ──> GET /api/quotes?symbols=... ──> Yahoo v8 chart (서버측)
   └─ effectiveAmount(asset, quote, usdkrw) ──> computeNetWorth(환산된 rows, savingsTotal)
```

## 서버리스 함수 (`api/quotes.js`)

Vercel Node 함수(신규 `api/` 디렉토리). Vite는 `/api`를 건드리지 않음(Vercel이 처리).

- 요청: `GET /api/quotes?symbols=005930.KS,AAPL,BTC-USD`
- 심볼 목록 + `USDKRW=X`를 각각 Yahoo v8 chart로 병렬 호출:
  `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1d`
  → `result[0].meta.regularMarketPrice`, `result[0].meta.currency` 추출.
- 응답 JSON:
  ```json
  { "quotes": { "AAPL": { "price": 195.2, "currency": "USD" },
                "005930.KS": { "price": 74000, "currency": "KRW" } },
    "usdkrw": 1380 }
  ```
- 개별 심볼 실패는 `quotes`에서 생략(부분 실패 허용, 200 반환). 전체 실패해도 `{ quotes:{}, usdkrw:null }`.
- 같은 오리진 호출이라 클라이언트 CORS 문제 없음. 함수→Yahoo는 서버측이라 CORS 무관.
- 캐시 헤더 `Cache-Control: s-maxage=60`(선택)로 과호출 완화.

### vercel.json 수정
현재 `{"source": "/(.*)", "destination": "/"}`가 `/api`까지 SPA로 삼킴 → 아래로 변경:
```json
{ "rewrites": [{ "source": "/((?!api/).*)", "destination": "/" }] }
```

## 순수 로직 (`src/lib/quote.ts`, TDD)

```ts
export interface Quote { price: number; currency: string }

// symbol+quantity+시세 있으면 수량×시세(USD면 ×usdkrw), 아니면 수동 amount 폴백.
// USD인데 usdkrw 없거나 0이면 환산 불가 → amount 폴백.
export function effectiveAmount(
  asset: { amount: number; symbol: string | null; quantity: number | null },
  quote: Quote | undefined,
  usdkrw: number | null,
): number
```

규칙:
- `asset.symbol && asset.quantity != null && quote && quote.price > 0` 아닐 때 → `asset.amount`.
- `quote.currency === 'USD'`: `usdkrw`가 유효(>0)면 `round(quantity × price × usdkrw)`, 아니면 `asset.amount`.
- 그 외 통화(KRW 등): `round(quantity × price)`.

## 클라이언트 훅 (`src/hooks/useQuotes.ts`)

```ts
export interface QuotesData { quotes: Record<string, Quote>; usdkrw: number | null }
export function useQuotes(symbols: string[]): UseQueryResult<QuotesData>
```
- queryKey `['quotes', [...symbols].sort().join(',')]`. `enabled: symbols.length > 0`.
- `staleTime: 60_000`, `refetchOnMount: true`. 실패 시 throw하지 않도록 폴백은 화면이 `effectiveAmount`로 처리(데이터 없으면 quote undefined → 수동값).
- fetch `/api/quotes?symbols=` + encodeURIComponent(join(',')).

## UI

### AssetSheet
- 타입이 `stock_us`/`stock_kr`/`crypto`일 때만 **심볼**·**수량** 입력 노출.
- `amount`(수동 평가액)는 유지하되 라벨을 "수동 평가액(시세 못 받을 때)"로. 
- 저장 payload: 기존 + `symbol: (해당 타입 && 입력값) || null`, `quantity: (해당 타입 && 값>0) ? Number : null`.
- 저장 가드: 이름 있음 && (`amount>0` || (`symbol` && `quantity>0`)).

### AssetsScreen
- 화면의 심볼 목록으로 `useQuotes` 호출. `usdkrw`·`quotes`로 각 자산 `effectiveAmount` 계산.
- 각 자산 표시 금액 = effectiveAmount. 시세로 계산된 항목(폴백 아님)엔 작은 "시세" 배지.
- 상단 순자산 = `computeNetWorth(assets.map(a => ({type:a.type, amount: effectiveAmount(a, quotes[a.symbol], usdkrw)})), savingsTotal).total`.
- 상단에 "새로고침" 버튼 → `useQuotes` refetch. 로딩 중 표시(선택).

### HubScreen
- 카드 순자산도 동일하게 `useQuotes`+`effectiveAmount` 반영(같은 훅·queryKey라 캐시 공유).

## 에러 처리

- 함수 전체 실패(네트워크/Yahoo 다운): `useQuotes`가 에러 → 화면은 quote undefined로 간주해 전부 수동값 폴백. 순자산 계산 정상.
- 로컬 dev(vite)에서는 `/api`가 없어 fetch 실패 → 전부 수동값 폴백(정상 동작). 실검증은 Vercel 배포본에서.

## 테스트

- `src/lib/quote.test.ts`: effectiveAmount — USD 환산, KRW 그대로, symbol/quantity 없음 폴백, 시세 없음 폴백, usdkrw 없음(USD) 폴백, price 0 폴백.
- 함수·훅·화면은 기존 관례대로 build 게이트.

## 파일 요약

신규:
- `api/quotes.js` — Yahoo 프록시 서버리스 함수
- `src/lib/quote.ts` + `src/lib/quote.test.ts`
- `src/hooks/useQuotes.ts`

수정:
- `vercel.json` (rewrite에서 /api 제외)
- `src/components/AssetSheet.tsx` (심볼·수량 입력)
- `src/screens/AssetsScreen.tsx` (시세 반영 + 새로고침 + 배지)
- `src/screens/HubScreen.tsx` (카드 시세 반영)

DB 마이그레이션: 없음(6-1의 symbol/quantity 컬럼 재사용).

## 배포/검증 (사용자 몫)

- push → Vercel 자동 배포(서버리스 함수 포함). DB 작업 없음.
- 자산 편집에서 심볼·수량 입력(예: 삼성전자 `005930.KS` 20주, 비트코인 `BTC-USD` 0.1개) → 순자산이 시세로 갱신되는지, 새로고침 동작하는지 확인.
