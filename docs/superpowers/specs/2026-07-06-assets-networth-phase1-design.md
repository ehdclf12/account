# 자산 현황 (⑥) 1단계 — 설계서

작성일: 2026-07-06
로드맵: 가계부 고도화 ⑥ 자산 현황 (최초 원비전, 규모 큼, 마지막). 2단계로 분리.
선행: ① 예산 ② 통계 ③ 고정비 ⑤ 저축 (완료). ④ 캘린더 뷰는 진행 안 함(사용자 확정).

## 목적

부부의 순자산(주식·코인·부동산·현금 − 부채)을 한 화면에서 본다. 저축 목표(⑤) 총합도
자동으로 합산된다. **1단계(6-1)는 외부 API 없이 수동 평가액**으로 순자산을 집계하고,
**2단계(6-2)에서 Yahoo Finance 프록시로 주식·코인을 수량×시세로 자동 평가**한다.

이 문서는 6-1만 다룬다. 6-2는 별도 스펙.

## 범위 결정 (확정)

- **시세 소스(6-2)**: Yahoo Finance 프록시(Vercel 서버리스 함수) 1개로 한국주식·미국주식·코인·환율 커버. 6-1 범위 밖.
- **2단계 분리**: 6-1 = 수동 평가액 + 순자산 + 저축 연동 + 부채. 6-2 = 실시간 시세.
- **위치**: `예산관리`(HubScreen) 안에 카드로 추가. 카드 순서 = **자산현황 / 집 / 코스모스**(자산현황 맨 위). 화면 라우트 `/assets`.
- **부채**: 등록함. 순자산 = 자산 − 부채.
- **인원 구분 없음**. 부부 합산만(⑤와 동일).
- **저축 연동**: ⑤ 저축 목표 총합을 "저축" 한 줄로 자동 표시(수정 불가). 기존 `useSavingsProgress` 재활용.
- **범위 밖(나중)**: 순자산 추이 그래프, 스냅샷 히스토리, 인원별 순자산. YAGNI.

## 데이터 모델 (Supabase)

새 마이그레이션 `supabase/schema-assets.sql` (idempotent, 사용자가 SQL Editor에서 실행):

```sql
create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'etc'
    check (type in ('stock_us','stock_kr','crypto','real_estate','cash','etc','liability')),
  amount bigint not null default 0 check (amount >= 0),  -- 수동 평가액(원). 부채도 양수, type이 부호 결정
  symbol text,        -- 6-2용(예: '005930.KS','AAPL','BTC-KRW'). 6-1엔 null
  quantity numeric,   -- 6-2용 보유수량. 6-1엔 null
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table assets enable row level security;
drop policy if exists auth_all on assets;
create policy auth_all on assets for all to authenticated using (true) with check (true);
```

- `amount`는 항상 양수. 부호는 `type`으로 결정(`liability` → 차감).
- `symbol`·`quantity`는 6-2 대비 미리 생성(6-1 로직은 사용 안 함). 6-2를 마이그레이션 없이 얹기 위함.

## 타입 (`src/types.ts`)

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

## 순수 로직 (`src/lib/networth.ts`, TDD 단위 테스트)

```ts
export function assetSign(type: AssetType): 1 | -1  // 'liability' → -1, 그 외 → +1

// rows: {type, amount}[], savingsTotal: number
// 반환: { total, byType } — byType은 각 타입 합계(부채는 양수 합계로 별도 표시용),
//        저축은 byType에 'savings' 키로 포함, total에 +savingsTotal 반영
export function computeNetWorth(
  rows: { type: AssetType; amount: number }[],
  savingsTotal: number,
): { total: number; byType: Record<string, number> }
```

- `total` = Σ(assetSign(type) × amount) + savingsTotal.
- `byType` = 타입별 amount 합계(표시용, 부호 적용 전 양수). 추가 키 `savings` = savingsTotal.
- 빈 rows + savingsTotal 0 → total 0, byType {}(또는 savings 0). 경계값 테스트.

## 훅 (`src/hooks/useAssets.ts`)

useFixedCosts 패턴:
- `useAssets()` — `active=true`, `created_at` 순, queryKey `['assets']`.
- `useAddAsset()` / `useUpdateAsset()` / `useDeleteAsset()` — insert/update/delete, onSuccess에 `['assets']` 무효화.
- 저축 총합은 별도 훅 없이 기존 `useSavingsProgress`(queryKey `['savings_progress']`) 재활용 → 값 합산.

## UI

### AssetsScreen (`/assets`)
- 뒤로가기 `‹ 예산관리`(nav `/budget`), 제목 "자산 현황".
- 상단: **순자산** 큰 숫자(`computeNetWorth().total`). 음수면 `#F04452`.
- 타입별 그룹 목록. 각 자산: 이름 + 평가액. 부채는 `−` 및 `#F04452`.
- **저축 줄**: "저축"(⑤ 총합), 수정 불가(탭 없음). 자산 목록 상단 또는 별도 줄.
- 항목 탭 → `AssetSheet`(편집).
- 하단 "자산 추가" 버튼.
- 자산이 없고 저축도 0이면 "등록된 자산이 없어요".

### AssetSheet (추가/편집)
FixedCostSheet 패턴. 필드: 이름, 타입(select: 미국주식/한국주식/코인/부동산/현금/기타/부채), 평가액. 삭제(편집 시).
- 6-1에는 symbol·quantity 입력 없음(6-2에서 주식·코인 타입일 때 추가).
- 저장 payload: `{ name, type, amount, symbol: null, quantity: null, active: true }`.

### HubScreen (`/budget`)
집 카드 **위에** "자산현황" 카드 추가. 헤드라인 "순자산" + `computeNetWorth().total`. 탭 → `/assets`.
카드 순서: 자산현황 / 집 / 코스모스.

### 라우팅 (`App.tsx`)
`<Route path="/assets" element={<AssetsScreen />} />` 추가.

### 실시간 (`useRealtime.ts`)
`assets` 테이블 구독 → `['assets']` 무효화.

## 테스트

- `src/lib/networth.test.ts`: assetSign(각 타입/부채), computeNetWorth(자산만, 부채 차감, 저축 합산, 빈 값 경계).
- 기존 tsc / build / vitest 통과 유지.
- 훅·화면은 기존 관례대로 단위 테스트 없음 → build 게이트.

## 파일 요약

신규:
- `supabase/schema-assets.sql`
- `src/lib/networth.ts` + `src/lib/networth.test.ts`
- `src/hooks/useAssets.ts`
- `src/screens/AssetsScreen.tsx`
- `src/components/AssetSheet.tsx`

수정:
- `src/types.ts` (AssetType, Asset)
- `src/screens/HubScreen.tsx` (자산현황 카드, 맨 위)
- `src/App.tsx` (라우트)
- `src/hooks/useRealtime.ts` (assets 구독)

## 6-2 연결 지점 (다음 스펙)

- `symbol`·`quantity`가 채워진 주식·코인 자산은 `/api/quotes`(Yahoo 프록시)로 시세 조회 →
  평가액 = quantity × price(× USD/KRW 환율, 미국주식만). `amount`는 수동 폴백.
- 6-2에서 AssetSheet에 종목코드·수량 입력, networth 계산에 시세 반영 추가.
