# 자산 현황 (⑥) 1단계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 부부의 순자산(자산 − 부채 + 저축)을 수동 평가액으로 한 화면에서 보여준다. 외부 API 없음(실시간 시세는 6-2).

**Architecture:** 저축(⑤)·고정비와 동일한 패턴. `assets` 테이블(수동 평가액 + 6-2 대비 symbol/quantity 예약 컬럼). 순자산 = Σ(assetSign(type)×amount) + 저축 총합(기존 `useSavingsProgress` 재활용). 예산관리 HubScreen에 자산현황 카드(맨 위), `/assets` 관리 화면.

**Tech Stack:** React 19 + TypeScript + Vite, @tanstack/react-query, Supabase, TailwindCSS. 순수 로직은 vitest로 TDD.

설계서: `docs/superpowers/specs/2026-07-06-assets-networth-phase1-design.md`

## Global Constraints

- 디자인 토큰만: `bg-card`, `text-ink`, `text-sub`, `bg-brand`, `text-white`. 음수/부채/삭제 색 `#F04452`.
- 이모지 사용 안 함.
- 인원별 구분 없음 — 부부 합산만.
- 부채(`liability` 타입)는 순자산에서 차감. `amount`는 항상 양수 저장, 부호는 type이 결정.
- 저축 총합은 ⑤의 `useSavingsProgress`(queryKey `['savings_progress']`) 재활용 — 새 계산 로직 만들지 않음. 저축 줄은 수정 불가.
- `symbol`·`quantity` 컬럼은 6-2 대비로 생성만; 6-1 로직·UI에서 사용 안 함(저장 시 항상 null).
- 금액은 `bigint`(원). 통화 표기 `formatKRW`.
- 각 코드 태스크 게이트: `npm run build`(tsc -b + vite build) + `npm run test`(vitest) 통과.
- import 별칭 `@/`.

## File Structure

신규:
- `supabase/schema-assets.sql` — 마이그레이션(사용자 실행)
- `src/lib/networth.ts` + `src/lib/networth.test.ts` — 순자산 계산 순수 로직
- `src/hooks/useAssets.ts` — 자산 CRUD 훅
- `src/screens/AssetsScreen.tsx` — 자산 목록·순자산 화면
- `src/components/AssetSheet.tsx` — 자산 추가/편집 시트

수정:
- `src/types.ts` — `AssetType`, `Asset`
- `src/screens/HubScreen.tsx` — 자산현황 카드(맨 위)
- `src/App.tsx` — `/assets` 라우트
- `src/hooks/useRealtime.ts` — assets 구독

---

### Task 1: 순자산 계산 로직 (lib/networth.ts)

**Files:**
- Create: `src/lib/networth.ts`
- Test: `src/lib/networth.test.ts`

**Interfaces:**
- Consumes: 없음 (순수 함수). `AssetType`는 이 파일 내에서 로컬로 쓰되, 인자 타입은 문자열 유니온으로 받음 — Task 2에서 types.ts에 정식 `AssetType`을 추가하고 이 파일이 그걸 import하도록 바꿀 필요는 없음(이 파일은 문자열만 다룸).
- Produces:
  - `assetSign(type: string): 1 | -1` — `'liability'` → -1, 그 외 → 1
  - `computeNetWorth(rows: { type: string; amount: number }[], savingsTotal: number): { total: number; byType: Record<string, number> }`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/lib/networth.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { assetSign, computeNetWorth } from './networth'

describe('assetSign', () => {
  it('부채는 -1', () => {
    expect(assetSign('liability')).toBe(-1)
  })
  it('그 외 자산은 +1', () => {
    expect(assetSign('stock_us')).toBe(1)
    expect(assetSign('crypto')).toBe(1)
    expect(assetSign('real_estate')).toBe(1)
  })
})

describe('computeNetWorth', () => {
  it('자산만 합산 + 저축', () => {
    const rows = [
      { type: 'stock_us', amount: 18000000 },
      { type: 'crypto', amount: 4300000 },
    ]
    const r = computeNetWorth(rows, 30000000)
    expect(r.total).toBe(52300000)
    expect(r.byType).toEqual({ stock_us: 18000000, crypto: 4300000, savings: 30000000 })
  })
  it('부채는 차감', () => {
    const rows = [
      { type: 'real_estate', amount: 62300000 },
      { type: 'liability', amount: 10000000 },
    ]
    const r = computeNetWorth(rows, 0)
    expect(r.total).toBe(52300000)
    expect(r.byType).toEqual({ real_estate: 62300000, liability: 10000000, savings: 0 })
  })
  it('같은 타입은 누적 합산', () => {
    const rows = [
      { type: 'cash', amount: 1000000 },
      { type: 'cash', amount: 500000 },
    ]
    const r = computeNetWorth(rows, 0)
    expect(r.total).toBe(1500000)
    expect(r.byType.cash).toBe(1500000)
  })
  it('빈 자산 + 저축 0 → total 0', () => {
    const r = computeNetWorth([], 0)
    expect(r.total).toBe(0)
    expect(r.byType).toEqual({ savings: 0 })
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/networth.test.ts`
Expected: FAIL ("Failed to resolve import './networth'")

- [ ] **Step 3: 최소 구현**

Create `src/lib/networth.ts`:
```ts
export function assetSign(type: string): 1 | -1 {
  return type === 'liability' ? -1 : 1
}

export function computeNetWorth(
  rows: { type: string; amount: number }[],
  savingsTotal: number,
): { total: number; byType: Record<string, number> } {
  const byType: Record<string, number> = {}
  let total = 0
  for (const row of rows) {
    byType[row.type] = (byType[row.type] ?? 0) + row.amount
    total += assetSign(row.type) * row.amount
  }
  byType.savings = savingsTotal
  total += savingsTotal
  return { total, byType }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/networth.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/networth.ts src/lib/networth.test.ts
git commit -m "feat: 순자산 계산 로직 (TDD)"
```

---

### Task 2: 스키마 마이그레이션 + 타입

**Files:**
- Create: `supabase/schema-assets.sql`
- Modify: `src/types.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `AssetType` 유니온: `'stock_us' | 'stock_kr' | 'crypto' | 'real_estate' | 'cash' | 'etc' | 'liability'`
  - `Asset` 인터페이스: `{ id: string; name: string; type: AssetType; amount: number; symbol: string | null; quantity: number | null; active: boolean; created_at: string }`

- [ ] **Step 1: 마이그레이션 SQL 작성**

Create `supabase/schema-assets.sql`:
```sql
-- 자산 현황(⑥ 1단계): 순자산 집계용 assets 테이블. symbol/quantity는 6-2(실시간 시세) 대비 예약.
-- Phase 1·2·예산·고정비·저축 실행 후 SQL Editor에서 실행. 재실행해도 안전(idempotent).

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'etc'
    check (type in ('stock_us','stock_kr','crypto','real_estate','cash','etc','liability')),
  amount bigint not null default 0 check (amount >= 0),
  symbol text,
  quantity numeric,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table assets enable row level security;
drop policy if exists auth_all on assets;
create policy auth_all on assets for all to authenticated using (true) with check (true);
```

- [ ] **Step 2: 타입 추가**

Modify `src/types.ts` — `SavingsGoal` 인터페이스 아래에 추가:
```ts
export type AssetType =
  | 'stock_us' | 'stock_kr' | 'crypto' | 'real_estate' | 'cash' | 'etc' | 'liability'

export interface Asset {
  id: string
  name: string
  type: AssetType
  amount: number
  symbol: string | null
  quantity: number | null
  active: boolean
  created_at: string
}
```

- [ ] **Step 3: 타입 컴파일 확인**

Run: `npx tsc -b`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add supabase/schema-assets.sql src/types.ts
git commit -m "feat: 자산 현황 스키마 마이그레이션 + 타입"
```

---

### Task 3: 데이터 훅 (useAssets)

**Files:**
- Create: `src/hooks/useAssets.ts`
- Modify: `src/hooks/useRealtime.ts`

**Interfaces:**
- Consumes: `Asset` (Task 2), supabase 클라이언트
- Produces:
  - `useAssets(): UseQueryResult<Asset[]>` — queryKey `['assets']`
  - `useAddAsset()` — `mutateAsync(Omit<Asset,'id'|'created_at'>)`
  - `useUpdateAsset()` — `mutateAsync(Partial<Asset> & { id: string })`
  - `useDeleteAsset()` — `mutateAsync(id: string)`

- [ ] **Step 1: 훅 파일 작성**

Create `src/hooks/useAssets.ts`:
```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Asset } from '@/types'

export function useAssets() {
  return useQuery({
    queryKey: ['assets'],
    queryFn: async (): Promise<Asset[]> => {
      const { data, error } = await supabase.from('assets')
        .select('*').eq('active', true).order('created_at')
      if (error) throw error
      return data as Asset[]
    },
  })
}

export function useAddAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (a: Omit<Asset, 'id' | 'created_at'>) => {
      const { error } = await supabase.from('assets').insert(a)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  })
}

export function useUpdateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (a: Partial<Asset> & { id: string }) => {
      const { id, ...rest } = a
      const { error } = await supabase.from('assets').update(rest).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  })
}

export function useDeleteAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('assets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  })
}
```

- [ ] **Step 2: 실시간 구독 추가**

Modify `src/hooks/useRealtime.ts` — `savings_goals` 구독 `.on(...)` 다음, `.subscribe()` 앞에 추가:
```ts
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' },
        () => qc.invalidateQueries({ queryKey: ['assets'] }))
```

- [ ] **Step 3: 빌드·테스트 통과 확인**

Run: `npm run build && npm run test`
Expected: 빌드 성공, 모든 테스트 PASS

- [ ] **Step 4: 커밋**

```bash
git add src/hooks/useAssets.ts src/hooks/useRealtime.ts
git commit -m "feat: 자산 데이터 훅 + 실시간 구독"
```

---

### Task 4: 자산 시트 + 자산 화면 + 라우트

**Files:**
- Create: `src/components/AssetSheet.tsx`
- Create: `src/screens/AssetsScreen.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useAssets`, `useAddAsset`, `useUpdateAsset`, `useDeleteAsset` (Task 3), `useSavingsProgress` (⑤, 기존), `assetSign`·`computeNetWorth` (Task 1), `formatKRW`, `Asset`, `AssetType`
- Produces: 라우트 `/assets`

- [ ] **Step 1: AssetSheet 작성**

Create `src/components/AssetSheet.tsx`:
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

  if (!open) return null

  async function save() {
    const amt = Number(amount) || 0
    if (!name || amt <= 0) return
    const payload = { name, type, amount: amt, symbol: null, quantity: null, active: true }
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
        <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="평가액" className="w-full bg-card rounded-xl px-3 py-2 outline-none" />
        <button onClick={save} className="w-full bg-brand text-white rounded-2xl py-3 font-bold">저장하기</button>
        {editing && <button onClick={remove} className="w-full text-[#F04452] text-sm py-1">삭제</button>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: AssetsScreen 작성**

Create `src/screens/AssetsScreen.tsx`:
```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAssets } from '@/hooks/useAssets'
import { useSavingsProgress } from '@/hooks/useSavingsGoals'
import { computeNetWorth } from '@/lib/networth'
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
  const { total } = computeNetWorth(assets, savingsTotal)

  const [editing, setEditing] = useState<Asset | null>(null)
  const [adding, setAdding] = useState(false)

  return (
    <div className="p-5 space-y-5">
      <button onClick={() => nav('/budget')} className="text-sub text-sm">‹ 예산관리</button>
      <h1 className="text-xl font-bold text-ink">자산 현황</h1>

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
          return (
            <button key={a.id} onClick={() => setEditing(a)}
              className="w-full flex items-center justify-between text-sm bg-card rounded-2xl px-4 py-3 active:opacity-70">
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] text-sub bg-white rounded px-1.5 py-0.5 shrink-0">{TYPE_LABEL[a.type]}</span>
                <span className="text-ink truncate">{a.name}</span>
              </span>
              <span className={liability ? 'text-[#F04452] shrink-0' : 'text-ink shrink-0'}>
                {liability ? '−' : ''}{formatKRW(a.amount)}
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

- [ ] **Step 3: 라우트 등록**

Modify `src/App.tsx`:
- import 추가(다른 화면 import 아래):
```tsx
import AssetsScreen from '@/screens/AssetsScreen'
```
- `/budget` Route 아래에 추가:
```tsx
            <Route path="/assets" element={<AssetsScreen />} />
```

- [ ] **Step 4: 빌드·테스트 통과 확인**

Run: `npm run build && npm run test`
Expected: 빌드 성공, 모든 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add src/components/AssetSheet.tsx src/screens/AssetsScreen.tsx src/App.tsx
git commit -m "feat: 자산 관리 화면 + 추가/편집 시트 + /assets 라우트"
```

---

### Task 5: 예산관리 자산현황 카드

**Files:**
- Modify: `src/screens/HubScreen.tsx`

**Interfaces:**
- Consumes: `useAssets` (Task 3), `useSavingsProgress` (기존), `computeNetWorth` (Task 1), `formatKRW`
- Produces: HubScreen 최상단 자산현황 카드

- [ ] **Step 1: import·데이터 추가**

Modify `src/screens/HubScreen.tsx`:
- import 추가(기존 import 블록에):
```tsx
import { useAssets } from '@/hooks/useAssets'
import { useSavingsProgress } from '@/hooks/useSavingsGoals'
import { computeNetWorth } from '@/lib/networth'
```
- 컴포넌트 본문 상단(`const nav = useNavigate()` 아래)에 추가:
```tsx
  const { data: assets = [] } = useAssets()
  const { data: progress = {} } = useSavingsProgress()
  const savingsTotal = Object.values(progress).reduce((a, b) => a + b, 0)
  const netWorth = computeNetWorth(assets, savingsTotal).total
```

- [ ] **Step 2: 자산현황 카드 삽입**

`<h1 ...>예산관리</h1>` 다음 줄(집 카드 `<button onClick={() => nav('/household')}` **위**)에 추가:
```tsx
      <button onClick={() => nav('/assets')}
        className="w-full text-left bg-card rounded-2xl p-5 active:opacity-70">
        <div className="flex justify-between items-center">
          <span className="font-bold text-ink text-lg">자산현황</span>
          <span className="text-sub text-xl">›</span>
        </div>
        <p className="text-sub text-sm mt-3">순자산</p>
        <p className={`text-3xl font-bold mt-1 ${netWorth < 0 ? 'text-[#F04452]' : 'text-ink'}`}>{formatKRW(netWorth)}</p>
      </button>
```

- [ ] **Step 3: 빌드·테스트 통과 확인**

Run: `npm run build && npm run test`
Expected: 빌드 성공, 모든 테스트 PASS

- [ ] **Step 4: 커밋**

```bash
git add src/screens/HubScreen.tsx
git commit -m "feat: 예산관리에 자산현황 카드(맨 위)"
```

---

## 실행 후 확인 (사용자 몫)

1. Supabase SQL Editor(프로젝트 `gkblndlotwdyoaxfyevs`)에서 `supabase/schema-assets.sql` 실행.
2. 예산관리 화면에 "자산현황" 카드가 집 위에 보이는지.
3. 자산현황 → 자산 추가(예: 삼성전자 한국주식 500만, 주택담보 부채 1000만) → 순자산이 자산−부채+저축으로 맞는지.
4. (선택) Supabase에서 `assets`를 Realtime publication에 추가 → 두 폰 실시간 반영.

## Self-Review 결과

- **Spec coverage:** 위치(HubScreen 카드 맨 위/라우트), 순자산=자산−부채+저축(computeNetWorth), 데이터 모델(symbol/quantity 예약 포함), 순수 로직(assetSign/computeNetWorth TDD), 훅 4종, 화면·시트, 저축 연동(useSavingsProgress 재활용) — 모두 태스크에 매핑. 6-2는 명시적으로 범위 밖.
- **Placeholder scan:** 없음. 모든 코드 스텝에 실제 코드 포함.
- **Type consistency:** `Asset`/`AssetType` 필드, 훅 시그니처, queryKey `['assets']`, `computeNetWorth`/`assetSign` 시그니처, `useSavingsProgress` 재활용 방식(Record 값 합산) 태스크 간 일치 확인.
