# 자산 현황 (⑥) 2단계 — 실시간 시세 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 주식·코인 자산을 보유수량 × 실시간 시세로 자동 평가하고, 시세 실패 시 수동 `amount`로 조용히 폴백한다.

**Architecture:** Vercel 서버리스 함수 `api/quotes.js`가 Yahoo Finance v8 chart를 대신 호출(키 불필요). 클라이언트는 `useQuotes` 훅으로 시세·환율을 받아 `effectiveAmount`(순수함수)로 각 자산을 원화 환산 → 기존 `computeNetWorth` 재사용. DB 마이그레이션 없음(6-1의 symbol/quantity 컬럼 재사용).

**Tech Stack:** React 19 + TypeScript + Vite, @tanstack/react-query, Vercel Node 함수, Yahoo Finance(비공식). 순수 로직 vitest TDD.

설계서: `docs/superpowers/specs/2026-07-06-assets-networth-phase2-design.md`

## Global Constraints

- 디자인 토큰만: `bg-card`, `text-ink`, `text-sub`, `bg-brand`, `text-white`, `text-brand`. 음수/부채/삭제 색 `#F04452`.
- 이모지 사용 안 함.
- 심볼은 사용자가 Yahoo 티커를 직접 입력(예: `005930.KS`, `AAPL`, `BTC-USD`). 자동조합 없음.
- 환전은 Yahoo가 돌려주는 `currency` 기준: `USD`면 `USDKRW=X` 환율로 환산, 그 외(KRW 등)는 그대로.
- 시세 실패/부분실패/환율없음/price 0 → 해당 자산은 수동 `amount`로 폴백(화면 안 깨짐). 시세로 계산된 항목만 "시세" 배지.
- 시세 반영 자산 타입은 `stock_us`/`stock_kr`/`crypto`만. 나머지는 수동 `amount`.
- 시세 값은 저장하지 않음(표시 시점 계산). `amount`는 수동 폴백값으로 유지.
- 금액은 정수 원, `formatKRW` 표기. 수량은 소수 허용(예: BTC 0.1).
- 각 코드 태스크 게이트: `npm run build`(tsc -b + vite build) + `npm run test`(vitest) 통과. `api/quotes.js`는 `node --check`로 문법 확인(tsconfig 대상 아님).
- import 별칭 `@/`.

## File Structure

신규:
- `src/lib/quote.ts` + `src/lib/quote.test.ts` — 시세 환산 순수 로직(`Quote`, `isLivePriced`, `effectiveAmount`)
- `api/quotes.js` — Yahoo 프록시 서버리스 함수
- `src/hooks/useQuotes.ts` — 시세 조회 훅

수정:
- `vercel.json` — rewrite에서 `/api` 제외
- `src/components/AssetSheet.tsx` — 심볼·수량 입력
- `src/screens/AssetsScreen.tsx` — 시세 반영 + 새로고침 + "시세" 배지
- `src/screens/HubScreen.tsx` — 카드 순자산 시세 반영

---

### Task 1: 시세 환산 순수 로직 (lib/quote.ts)

**Files:**
- Create: `src/lib/quote.ts`
- Test: `src/lib/quote.test.ts`

**Interfaces:**
- Consumes: 없음(순수 함수)
- Produces:
  - `interface Quote { price: number; currency: string }`
  - `isLivePriced(asset: { symbol: string | null; quantity: number | null }, quote: Quote | undefined, usdkrw: number | null): boolean`
  - `effectiveAmount(asset: { amount: number; symbol: string | null; quantity: number | null }, quote: Quote | undefined, usdkrw: number | null): number`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/lib/quote.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { effectiveAmount, isLivePriced } from './quote'

const aapl = { amount: 900000, symbol: 'AAPL', quantity: 10 }
const samsung = { amount: 0, symbol: '005930.KS', quantity: 20 }

describe('isLivePriced', () => {
  it('USD 시세+환율 있으면 true', () => {
    expect(isLivePriced(aapl, { price: 195.2, currency: 'USD' }, 1380)).toBe(true)
  })
  it('USD인데 환율 없으면 false', () => {
    expect(isLivePriced(aapl, { price: 195.2, currency: 'USD' }, null)).toBe(false)
  })
  it('KRW 시세면 환율 없어도 true', () => {
    expect(isLivePriced(samsung, { price: 74000, currency: 'KRW' }, null)).toBe(true)
  })
  it('심볼/수량/시세 없으면 false', () => {
    expect(isLivePriced({ symbol: null, quantity: null }, undefined, 1380)).toBe(false)
    expect(isLivePriced(aapl, undefined, 1380)).toBe(false)
    expect(isLivePriced({ symbol: 'AAPL', quantity: null }, { price: 1, currency: 'USD' }, 1380)).toBe(false)
    expect(isLivePriced(aapl, { price: 0, currency: 'USD' }, 1380)).toBe(false)
  })
})

describe('effectiveAmount', () => {
  it('USD는 환율로 환산', () => {
    expect(effectiveAmount(aapl, { price: 195.2, currency: 'USD' }, 1380)).toBe(2693760)
  })
  it('KRW는 그대로', () => {
    expect(effectiveAmount(samsung, { price: 74000, currency: 'KRW' }, 1380)).toBe(1480000)
  })
  it('심볼 없으면 수동 amount 폴백', () => {
    expect(effectiveAmount({ amount: 5000000, symbol: null, quantity: null }, undefined, 1380)).toBe(5000000)
  })
  it('시세 못 받으면 수동 amount 폴백', () => {
    expect(effectiveAmount(aapl, undefined, 1380)).toBe(900000)
  })
  it('USD인데 환율 없으면 폴백', () => {
    expect(effectiveAmount(aapl, { price: 195.2, currency: 'USD' }, null)).toBe(900000)
  })
  it('price 0이면 폴백', () => {
    expect(effectiveAmount(aapl, { price: 0, currency: 'USD' }, 1380)).toBe(900000)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/quote.test.ts`
Expected: FAIL ("Failed to resolve import './quote'")

- [ ] **Step 3: 최소 구현**

Create `src/lib/quote.ts`:
```ts
export interface Quote { price: number; currency: string }

export function isLivePriced(
  asset: { symbol: string | null; quantity: number | null },
  quote: Quote | undefined,
  usdkrw: number | null,
): boolean {
  if (!asset.symbol || asset.quantity == null || !quote || !(quote.price > 0)) return false
  if (quote.currency === 'USD') return !!usdkrw && usdkrw > 0
  return true
}

export function effectiveAmount(
  asset: { amount: number; symbol: string | null; quantity: number | null },
  quote: Quote | undefined,
  usdkrw: number | null,
): number {
  if (!isLivePriced(asset, quote, usdkrw)) return asset.amount
  const mult = quote!.currency === 'USD' ? usdkrw! : 1
  return Math.round(asset.quantity! * quote!.price * mult)
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/quote.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/quote.ts src/lib/quote.test.ts
git commit -m "feat: 시세 환산 순수 로직 (TDD)"
```

---

### Task 2: 서버리스 시세 프록시 (api/quotes.js) + vercel.json

**Files:**
- Create: `api/quotes.js`
- Modify: `vercel.json`

**Interfaces:**
- Consumes: 없음(런타임 Yahoo 호출)
- Produces: `GET /api/quotes?symbols=A,B,C` → `{ quotes: { [symbol]: { price: number, currency: string } }, usdkrw: number | null }`

- [ ] **Step 1: 서버리스 함수 작성**

Create `api/quotes.js`:
```js
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

export default async function handler(req, res) {
  const raw = (req.query && req.query.symbols ? req.query.symbols : '').toString()
  const symbols = raw.split(',').map((s) => s.trim()).filter(Boolean)
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
```

- [ ] **Step 2: 문법 확인**

Run: `node --check api/quotes.js`
Expected: 출력 없음(에러 없으면 통과)

- [ ] **Step 3: vercel.json에서 /api 제외**

Replace `vercel.json` 전체 내용:
```json
{
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/" }]
}
```

- [ ] **Step 4: 빌드·테스트 통과 확인**

Run: `npm run build && npm run test`
Expected: 빌드 성공(api/는 빌드 대상 아님), 모든 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add api/quotes.js vercel.json
git commit -m "feat: Yahoo 시세 프록시 서버리스 함수 + vercel /api 라우팅"
```

---

### Task 3: 시세 조회 훅 (useQuotes)

**Files:**
- Create: `src/hooks/useQuotes.ts`

**Interfaces:**
- Consumes: `Quote` (Task 1), `/api/quotes` (Task 2)
- Produces:
  - `interface QuotesData { quotes: Record<string, Quote>; usdkrw: number | null }`
  - `useQuotes(symbols: string[]): UseQueryResult<QuotesData>` — queryKey `['quotes', 정렬된심볼조인]`, `enabled: symbols.length > 0`, `staleTime: 60000`

- [ ] **Step 1: 훅 파일 작성**

Create `src/hooks/useQuotes.ts`:
```ts
import { useQuery } from '@tanstack/react-query'
import type { Quote } from '@/lib/quote'

export interface QuotesData { quotes: Record<string, Quote>; usdkrw: number | null }

export function useQuotes(symbols: string[]) {
  const key = [...symbols].sort().join(',')
  return useQuery({
    queryKey: ['quotes', key],
    enabled: symbols.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<QuotesData> => {
      const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(key)}`)
      if (!res.ok) throw new Error('quotes fetch failed')
      return res.json() as Promise<QuotesData>
    },
  })
}
```

- [ ] **Step 2: 빌드·테스트 통과 확인**

Run: `npm run build && npm run test`
Expected: 빌드 성공, 모든 테스트 PASS

- [ ] **Step 3: 커밋**

```bash
git add src/hooks/useQuotes.ts
git commit -m "feat: 시세 조회 훅 useQuotes"
```

---

### Task 4: AssetSheet 심볼·수량 입력

**Files:**
- Modify: `src/components/AssetSheet.tsx` (전체 교체)

**Interfaces:**
- Consumes: `useAddAsset`/`useUpdateAsset`/`useDeleteAsset` (기존), `Asset`/`AssetType` (기존)
- Produces: 주식·코인 타입일 때 symbol·quantity 저장

- [ ] **Step 1: AssetSheet 전체 교체**

Replace `src/components/AssetSheet.tsx` 전체 내용:
```tsx
import { useState } from 'react'
import { useAddAsset, useUpdateAsset, useDeleteAsset } from '@/hooks/useAssets'
import type { Asset, AssetType } from '@/types'

const TYPE_OPTIONS: { value: AssetType; label: string }[] = [
  { value: 'stock_us', label: '미국주식' },
  { value: 'stock_kr', label: '한국주식' },
  { value: 'crypto', label: '코인' },
  { value: 'real_estate', label: '부동산' },
  { value: 'cash', label: '현금' },
  { value: 'etc', label: '기타' },
  { value: 'liability', label: '부채' },
]

export default function AssetSheet(
  { open, onClose, editing }: { open: boolean; onClose: () => void; editing?: Asset },
) {
  const add = useAddAsset(); const upd = useUpdateAsset(); const del = useDeleteAsset()

  const [name, setName] = useState(editing?.name ?? '')
  const [type, setType] = useState<AssetType>(editing?.type ?? 'stock_us')
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '')
  const [symbol, setSymbol] = useState(editing?.symbol ?? '')
  const [quantity, setQuantity] = useState(editing?.quantity != null ? String(editing.quantity) : '')

  if (!open) return null

  const isMarket = type === 'stock_us' || type === 'stock_kr' || type === 'crypto'

  async function save() {
    const amt = Number(amount) || 0
    const qty = Number(quantity) || 0
    const sym = symbol.trim()
    const hasHolding = isMarket && !!sym && qty > 0
    if (!name || (amt <= 0 && !hasHolding)) return
    const payload = {
      name, type, amount: amt,
      symbol: hasHolding ? sym : null,
      quantity: hasHolding ? qty : null,
      active: true,
    }
    if (editing) await upd.mutateAsync({ id: editing.id, ...payload })
    else await add.mutateAsync(payload)
    onClose()
  }

  async function remove() {
    if (editing && confirm('이 자산을 삭제할까요?')) { await del.mutateAsync(editing.id); onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <span className="font-bold text-ink">{editing ? '자산 수정' : '자산 추가'}</span>
          <button onClick={onClose} className="text-sub text-sm font-medium">닫기</button>
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름 (예: 삼성전자, 우리집)" className="w-full bg-card rounded-xl px-3 py-2 outline-none" />
        <select value={type} onChange={(e) => setType(e.target.value as AssetType)} className="w-full bg-card rounded-xl px-3 py-2 outline-none">
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {isMarket && (
          <div className="flex gap-2">
            <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="심볼 (예: 005930.KS, AAPL, BTC-USD)" className="flex-1 bg-card rounded-xl px-3 py-2 outline-none" />
            <input value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="수량" className="w-24 bg-card rounded-xl px-3 py-2 outline-none" />
          </div>
        )}
        <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder={isMarket ? '수동 평가액 (시세 못 받을 때, 선택)' : '평가액'} className="w-full bg-card rounded-xl px-3 py-2 outline-none" />
        <button onClick={save} className="w-full bg-brand text-white rounded-2xl py-3 font-bold">저장하기</button>
        {editing && <button onClick={remove} className="w-full text-[#F04452] text-sm py-1">삭제</button>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 빌드·테스트 통과 확인**

Run: `npm run build && npm run test`
Expected: 빌드 성공, 모든 테스트 PASS

- [ ] **Step 3: 커밋**

```bash
git add src/components/AssetSheet.tsx
git commit -m "feat: AssetSheet 심볼·수량 입력(주식·코인)"
```

---

### Task 5: 화면 시세 반영 (AssetsScreen + HubScreen)

**Files:**
- Modify: `src/screens/AssetsScreen.tsx` (전체 교체)
- Modify: `src/screens/HubScreen.tsx`

**Interfaces:**
- Consumes: `useQuotes` (Task 3), `effectiveAmount`·`isLivePriced` (Task 1), `useAssets`/`useSavingsProgress`/`computeNetWorth`/`formatKRW` (기존)
- Produces: 없음(최종 화면)

- [ ] **Step 1: AssetsScreen 전체 교체**

Replace `src/screens/AssetsScreen.tsx` 전체 내용:
```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAssets } from '@/hooks/useAssets'
import { useSavingsProgress } from '@/hooks/useSavingsGoals'
import { useQuotes } from '@/hooks/useQuotes'
import { computeNetWorth } from '@/lib/networth'
import { effectiveAmount, isLivePriced } from '@/lib/quote'
import { formatKRW } from '@/lib/format'
import AssetSheet from '@/components/AssetSheet'
import type { Asset, AssetType } from '@/types'

const TYPE_LABEL: Record<AssetType, string> = {
  stock_us: '미국주식', stock_kr: '한국주식', crypto: '코인',
  real_estate: '부동산', cash: '현금', etc: '기타', liability: '부채',
}

export default function AssetsScreen() {
  const nav = useNavigate()
  const { data: assets = [] } = useAssets()
  const { data: progress = {} } = useSavingsProgress()
  const savingsTotal = Object.values(progress).reduce((a, b) => a + b, 0)

  const symbols = assets.map((a) => a.symbol).filter((s): s is string => !!s)
  const quotesQuery = useQuotes(symbols)
  const quotes = quotesQuery.data?.quotes ?? {}
  const usdkrw = quotesQuery.data?.usdkrw ?? null

  const netRows = assets.map((a) => ({ type: a.type, amount: effectiveAmount(a, quotes[a.symbol ?? ''], usdkrw) }))
  const { total } = computeNetWorth(netRows, savingsTotal)

  const [editing, setEditing] = useState<Asset | null>(null)
  const [adding, setAdding] = useState(false)

  return (
    <div className="p-5 space-y-5">
      <button onClick={() => nav('/budget')} className="text-sub text-sm">‹ 예산관리</button>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">자산 현황</h1>
        <button onClick={() => quotesQuery.refetch()} disabled={quotesQuery.isFetching} className="text-sub text-sm">
          {quotesQuery.isFetching ? '불러오는 중…' : '새로고침'}
        </button>
      </div>

      <div>
        <p className="text-sub text-sm">순자산</p>
        <p className={`text-4xl font-bold mt-1 ${total < 0 ? 'text-[#F04452]' : 'text-ink'}`}>{formatKRW(total)}</p>
      </div>

      <div className="space-y-2">
        {savingsTotal > 0 && (
          <div className="flex items-center justify-between text-sm bg-card rounded-2xl px-4 py-3">
            <span className="text-ink">저축</span>
            <span className="text-ink">{formatKRW(savingsTotal)}</span>
          </div>
        )}
        {assets.length === 0 && savingsTotal === 0 && (
          <p className="text-sub text-sm text-center py-6">등록된 자산이 없어요</p>
        )}
        {assets.map((a) => {
          const liability = a.type === 'liability'
          const quote = quotes[a.symbol ?? '']
          const eff = effectiveAmount(a, quote, usdkrw)
          const live = isLivePriced(a, quote, usdkrw)
          return (
            <button key={a.id} onClick={() => setEditing(a)}
              className="w-full flex items-center justify-between text-sm bg-card rounded-2xl px-4 py-3 active:opacity-70">
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] text-sub bg-white rounded px-1.5 py-0.5 shrink-0">{TYPE_LABEL[a.type]}</span>
                <span className="text-ink truncate">{a.name}</span>
                {live && <span className="text-[10px] text-brand bg-white rounded px-1.5 py-0.5 shrink-0">시세</span>}
              </span>
              <span className={liability ? 'text-[#F04452] shrink-0' : 'text-ink shrink-0'}>
                {liability ? '−' : ''}{formatKRW(eff)}
              </span>
            </button>
          )
        })}
      </div>

      <button onClick={() => setAdding(true)} className="w-full bg-brand text-white rounded-2xl py-3 font-bold">자산 추가</button>

      {adding && <AssetSheet open onClose={() => setAdding(false)} />}
      {editing && <AssetSheet open onClose={() => setEditing(null)} editing={editing} />}
    </div>
  )
}
```

- [ ] **Step 2: HubScreen 시세 반영**

Modify `src/screens/HubScreen.tsx`:
- import 블록에 추가(`import { computeNetWorth } ...` 아래):
```tsx
import { useQuotes } from '@/hooks/useQuotes'
import { effectiveAmount } from '@/lib/quote'
```
- 기존 순자산 계산부(아래 4줄)를 교체:
```tsx
  const { data: assets = [] } = useAssets()
  const { data: progress = {} } = useSavingsProgress()
  const savingsTotal = Object.values(progress).reduce((a, b) => a + b, 0)
  const netWorth = computeNetWorth(assets, savingsTotal).total
```
→ 아래로:
```tsx
  const { data: assets = [] } = useAssets()
  const { data: progress = {} } = useSavingsProgress()
  const savingsTotal = Object.values(progress).reduce((a, b) => a + b, 0)
  const symbols = assets.map((a) => a.symbol).filter((s): s is string => !!s)
  const { data: q } = useQuotes(symbols)
  const quotes = q?.quotes ?? {}
  const usdkrw = q?.usdkrw ?? null
  const netRows = assets.map((a) => ({ type: a.type, amount: effectiveAmount(a, quotes[a.symbol ?? ''], usdkrw) }))
  const netWorth = computeNetWorth(netRows, savingsTotal).total
```

- [ ] **Step 3: 빌드·테스트 통과 확인**

Run: `npm run build && npm run test`
Expected: 빌드 성공, 모든 테스트 PASS

- [ ] **Step 4: 커밋**

```bash
git add src/screens/AssetsScreen.tsx src/screens/HubScreen.tsx
git commit -m "feat: 자산 화면·허브 카드 실시간 시세 반영 + 새로고침"
```

---

## 실행 후 확인 (사용자 몫)

1. DB 작업 없음. push → Vercel 자동 배포(서버리스 함수 포함).
2. 자산현황 → 자산 편집: 삼성전자 타입 한국주식, 심볼 `005930.KS`, 수량 20 저장 → "시세" 배지와 함께 평가액이 시세로 뜨는지.
3. 비트코인 타입 코인, 심볼 `BTC-USD`, 수량 0.1 → 원화 환산되는지.
4. "새로고침" 눌러 갱신, 순자산·허브 카드 반영 확인.
5. (참고) 로컬 vite dev에서는 `/api`가 없어 시세가 안 뜨고 수동값으로 폴백됨 — 정상. 실검증은 Vercel 배포본.

## Self-Review 결과

- **Spec coverage:** 서버리스 함수(api/quotes.js)+vercel 라우팅(Task 2), 심볼 직접입력·환전 currency 기준(Task 1 effectiveAmount + Task 4 입력), 갱신 자동+새로고침(Task 5 useQuotes+refetch), 폴백·"시세" 배지(Task 1 isLivePriced + Task 5), 주식·코인만 시세(Task 4 isMarket), 시세 미저장·amount 폴백 — 모두 매핑. DB 마이그레이션 없음 명시.
- **Placeholder scan:** 없음. 모든 코드 스텝에 실제 코드 포함.
- **Type consistency:** `Quote`(lib/quote.ts) → useQuotes·화면에서 동일 import. `effectiveAmount`/`isLivePriced` 시그니처, `QuotesData` 형태, queryKey `['quotes', key]`, `assets.map(...).filter((s): s is string => !!s)` 심볼 추출 방식 태스크 간 일치 확인.
