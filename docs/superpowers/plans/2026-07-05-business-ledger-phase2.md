# 사업 장부 Phase 2 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 가계 장부 위에 사업 장부(사업 수입/지출 + 사업자금 잔액 + 가계↔사업 양방향 이체)를 얹어, 사업 재무를 분리 관리하되 이체로 유기적으로 연동한다.

**Architecture:** Phase 1과 동일 스택. `categories`/`transactions`에 `scope`(household|business), `categories`에 `is_fund_transfer` 추가. 가계 조회는 `scope='household'`로 격리, 사업은 `scope='business'`. 이체는 가계 is_fund_transfer 거래 1건으로 기록(보내기=지출, 받기=수입)하고 사업자금이 이를 유입/유출원으로 읽는다.

**Tech Stack:** React+Vite+TS+Tailwind, Supabase, TanStack Query, Vitest.

## Global Constraints
- 통화 KRW 정수, `₩` + 콤마. 한국어 UI. 이모지 없음(TDS 텍스트 위주).
- `scope`: 'household' | 'business'. `type`: 'expense' | 'income'. 이체 방향은 type으로 구분(보내기=expense/받기=income), scope=household, category.is_fund_transfer=true.
- 사업자금 잔액 = Σ(가계 is_fund_transfer expense) − Σ(가계 is_fund_transfer income) + Σ(business income) − Σ(business expense).
- 가계 화면/통계는 절대 business 데이터를 포함하지 않는다.
- 커밋 말미 `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Node는 PATH에 없음: 모든 node/npm/npx 앞에 `export PATH="$HOME/.local/opt/node/bin:$PATH" && `.

---

## Task P2-1: 마이그레이션 SQL (schema-phase2.sql)

**Files:** Create `supabase/schema-phase2.sql`

- [ ] **Step 1**: 아래 내용으로 파일 생성
```sql
-- Phase 2: 사업 장부. Phase 1 schema.sql 실행 후 SQL Editor에서 실행.
alter table categories add column scope text not null default 'household'
  check (scope in ('household','business'));
alter table categories add column is_fund_transfer boolean not null default false;
alter table transactions add column scope text not null default 'household'
  check (scope in ('household','business'));

insert into categories (name, icon, type, is_fixed, sort_order, scope, is_fund_transfer)
values ('사업자금 이체','', 'expense', false, 90, 'household', true);

insert into categories (name, icon, type, is_fixed, sort_order, scope, is_fund_transfer) values
  ('재료비','', 'expense', false, 1, 'business', false),
  ('인건비','', 'expense', false, 2, 'business', false),
  ('임대료','', 'expense', false, 3, 'business', false),
  ('매출','',   'income',  false, 1, 'business', false),
  ('기타수입','','income',  false, 2, 'business', false);
```
- [ ] **Step 2**: 커밋
```bash
git add supabase/schema-phase2.sql
git commit -m "feat: 사업 장부 마이그레이션 SQL (scope + 이체 + 시드)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task P2-2: 타입/유틸 확장 — scope + 사업자금 계산 (TDD)

**Files:**
- Modify: `src/types.ts` (Category/Transaction에 scope, Category에 is_fund_transfer)
- Create: `src/lib/businessFund.ts`, `src/lib/businessFund.test.ts`

**Interfaces:**
- Produces: `Scope='household'|'business'`. `computeFundBalance(householdTransfers: Transaction[], businessTxs: Transaction[]): number`.
  - householdTransfers: 가계의 is_fund_transfer 거래들(expense=유입, income=유출).
  - businessTxs: scope=business 거래들(income=유입, expense=유출).

- [ ] **Step 1**: `src/types.ts` 수정 — 타입 추가
```ts
export type Scope = 'household' | 'business'
```
그리고 `Category`에 `scope: Scope; is_fund_transfer: boolean` 추가, `Transaction`에 `scope: Scope` 추가.

- [ ] **Step 2**: 실패 테스트 `src/lib/businessFund.test.ts`
```ts
import { describe, it, expect } from 'vitest'
import { computeFundBalance } from './businessFund'
import type { Transaction } from '@/types'

const tx = (p: Partial<Transaction>): Transaction => ({
  id: 'x', who: 'husband', type: 'expense', amount: 0, category_id: null,
  payment_method_id: null, date: '2026-07-01', memo: '', created_at: '',
  scope: 'household', ...p,
})

describe('computeFundBalance', () => {
  it('이체 유입 - 역이체 유출 + 사업수입 - 사업지출', () => {
    const transfers = [
      tx({ type: 'expense', amount: 500000 }), // 가계→사업 보내기 (유입)
      tx({ type: 'income', amount: 100000 }),  // 사업→가계 받기 (유출)
    ]
    const biz = [
      tx({ scope: 'business', type: 'income', amount: 800000 }),
      tx({ scope: 'business', type: 'expense', amount: 200000 }),
    ]
    expect(computeFundBalance(transfers, biz)).toBe(1000000) // 500-100+800-200=1000
  })
  it('빈 입력은 0', () => {
    expect(computeFundBalance([], [])).toBe(0)
  })
})
```
- [ ] **Step 3**: 실패 확인 → 구현 `src/lib/businessFund.ts`
```ts
import type { Transaction } from '@/types'

export function computeFundBalance(
  householdTransfers: Transaction[],
  businessTxs: Transaction[],
): number {
  let bal = 0
  for (const t of householdTransfers) bal += t.type === 'expense' ? t.amount : -t.amount
  for (const t of businessTxs) bal += t.type === 'income' ? t.amount : -t.amount
  return bal
}
```
- [ ] **Step 4**: `export PATH=... && npx vitest run` PASS, `npx tsc --noEmit` 에러 없음
- [ ] **Step 5**: 커밋
```bash
git add src/types.ts src/lib/businessFund.ts src/lib/businessFund.test.ts
git commit -m "feat: scope 타입 + 사업자금 잔액 계산 (TDD)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task P2-3: 데이터 훅 — 가계 스코프 격리 + 사업 훅 + 이체

**Files:**
- Modify: `src/hooks/useCategories.ts`, `src/hooks/useTransactions.ts` (scope 필터)
- Create: `src/hooks/useBusiness.ts`

**Interfaces:**
- `useCategories()` → household+일반 카테고리만(입력 시트용). scope='household' AND is_fund_transfer=false 필터.
- `useTransactions(y,m)` → scope='household' AND is_fund_transfer=false 인 일반 가계 내역만(요약·목록). ※ 이체 거래는 별도로 다룸.
- 신설(useBusiness.ts):
  - `useBusinessCategories()` → scope='business'.
  - `useBusinessTransactions(y,m)` → scope='business', 월 필터.
  - `useAddBusinessTx()/useUpdateBusinessTx()/useDeleteBusinessTx()`.
  - `useFundData()` → { transfers: Transaction[](전체기간 is_fund_transfer), business: Transaction[](전체기간 scope=business) } — 잔액 계산용.
  - `useFundTransfer()` → mutation({ direction:'to_business'|'to_household', amount, date, memo }) → 가계 is_fund_transfer 거래 1건 insert (to_business=expense, to_household=income, scope='household', category_id=사업자금이체 카테고리).
  - `useTransferCategoryId()` → 사업자금이체 카테고리 id 조회.

- [ ] **Step 1**: `useCategories.ts` queryFn에 `.eq('scope','household').eq('is_fund_transfer', false)` 추가. (add/update/delete는 그대로.)
- [ ] **Step 2**: `useTransactions.ts` `useTransactions` queryFn에 `.eq('scope','household').eq(...)` — 단, 조인 없이 is_fund_transfer는 categories 속성이므로, transactions에는 scope만 있음. 따라서 **가계 일반 내역 = scope='household'**로 필터하고, 이체 거래도 scope='household'라 섞인다. 이를 구분하기 위해:
  - 방법: 이체 거래를 요약/목록에서 제외하려면 category의 is_fund_transfer를 알아야 함. 조인 대신, **transactions 조회 시 category_id로 이체 카테고리를 제외**한다. 구현: 먼저 이체 카테고리 id를 구해(별도 쿼리/파라미터) `.neq('category_id', transferCatId)`.
  - 단순화를 위해 `useTransactions`는 그대로 scope='household' 필터만 추가하고, **홈/내역 요약 계산 시 이체 카테고리를 제외**하는 방식 대신, 여기서는 **transactions에 조인 셀렉트**를 쓴다: `.select('*, categories!inner(is_fund_transfer, scope)')` 후 클라이언트에서 `scope==='household' && !is_fund_transfer`만 사용. 그러나 타입이 복잡해지므로, 아래 확정 방식을 따른다.
  - **확정 방식**: `useTransactions`는 `.eq('scope','household')`만 적용(이체 포함). 그리고 홈/내역에서 쓰는 목록·요약은 **이체 거래 포함이 옵션1 취지에 맞음**(이체는 가계 지출/수입으로 보이는 게 맞다). 즉 이체 거래는 가계 내역에 "사업자금 이체"로 그대로 노출되고 지출/수입 합에도 포함된다. → 추가 제외 불필요.
  - 따라서 **Step 2 실제 변경: `useTransactions` queryFn에 `.eq('scope','household')` 한 줄만 추가**. (이체는 가계에 노출되어야 하므로 제외하지 않음.)
- [ ] **Step 3**: `useBusiness.ts` 작성 (아래 전체)
```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { monthKey } from '@/lib/date'
import type { Category, Transaction } from '@/types'

// 사업 카테고리
export function useBusinessCategories() {
  return useQuery({
    queryKey: ['categories', 'business'],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase.from('categories')
        .select('*').eq('scope', 'business').order('type').order('sort_order')
      if (error) throw error
      return data as Category[]
    },
  })
}

// 사업 월별 내역
export function useBusinessTransactions(year: number, month: number) {
  return useQuery({
    queryKey: ['transactions', 'business', monthKey(year, month)],
    queryFn: async (): Promise<Transaction[]> => {
      const prefix = monthKey(year, month)
      const { data, error } = await supabase.from('transactions')
        .select('*').eq('scope', 'business')
        .gte('date', `${prefix}-01`).lte('date', `${prefix}-31`)
        .order('date', { ascending: false }).order('created_at', { ascending: false })
      if (error) throw error
      return data as Transaction[]
    },
  })
}

// 사업자금 계산용 전체기간 데이터 (이체 + 사업 거래)
export function useFundData() {
  return useQuery({
    queryKey: ['fund-data'],
    queryFn: async () => {
      const [transfers, business] = await Promise.all([
        supabase.from('transactions').select('*, categories!inner(is_fund_transfer)')
          .eq('scope', 'household').eq('categories.is_fund_transfer', true),
        supabase.from('transactions').select('*').eq('scope', 'business'),
      ])
      if (transfers.error) throw transfers.error
      if (business.error) throw business.error
      return {
        transfers: (transfers.data ?? []) as unknown as Transaction[],
        business: (business.data ?? []) as Transaction[],
      }
    },
  })
}

// 사업자금이체 카테고리 id
export function useTransferCategoryId() {
  return useQuery({
    queryKey: ['transfer-cat-id'],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.from('categories')
        .select('id').eq('is_fund_transfer', true).limit(1).maybeSingle()
      if (error) throw error
      return data?.id ?? null
    },
  })
}

export type NewBizTx = Omit<Transaction, 'id' | 'created_at'>

export function useAddBusinessTx() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (t: NewBizTx) => {
      const { error } = await supabase.from('transactions').insert({ ...t, scope: 'business' })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['fund-data'] }) },
  })
}

export function useUpdateBusinessTx() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (t: Partial<Transaction> & { id: string }) => {
      const { id, ...rest } = t
      const { error } = await supabase.from('transactions').update(rest).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['fund-data'] }) },
  })
}

export function useDeleteBusinessTx() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['fund-data'] }) },
  })
}

// 이체: 가계 is_fund_transfer 거래 1건 생성
export function useFundTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { direction: 'to_business' | 'to_household'; amount: number; date: string; memo: string; who: 'husband' | 'wife'; transferCategoryId: string }) => {
      const { error } = await supabase.from('transactions').insert({
        who: p.who,
        type: p.direction === 'to_business' ? 'expense' : 'income',
        amount: p.amount,
        category_id: p.transferCategoryId,
        payment_method_id: null,
        date: p.date,
        memo: p.memo || (p.direction === 'to_business' ? '사업자금 보내기' : '사업자금 받기'),
        scope: 'household',
      })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['fund-data'] }) },
  })
}
```
- [ ] **Step 4**: `npx tsc --noEmit`, `npm run build`, `npx vitest run` 회귀 없음
- [ ] **Step 5**: 커밋
```bash
git add src/hooks/useCategories.ts src/hooks/useTransactions.ts src/hooks/useBusiness.ts
git commit -m "feat: 가계 scope 격리 + 사업 훅 + 사업자금 이체

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task P2-4: 사업 화면 + 이체 시트 + 사업 입력 시트

**Files:**
- Create: `src/components/BusinessSheet.tsx` (사업 수입/지출 입력·수정)
- Create: `src/components/TransferSheet.tsx` (양방향 이체)
- Create: `src/screens/BusinessScreen.tsx`
- Modify: `src/components/BottomNav.tsx` (사업 탭 추가), `src/App.tsx` (라우트 `/business`)

**Interfaces:**
- Consumes: P2-2 `computeFundBalance`, P2-3 훅들, `@/App` `useIdentity`, `formatKRW`, `groupByDate`, `formatDayHeader`, `TransactionRow`.

- [ ] **Step 1**: `src/components/BusinessSheet.tsx` — 사업 입력/수정 시트
```tsx
import { useState } from 'react'
import { useBusinessCategories, useAddBusinessTx, useUpdateBusinessTx } from '@/hooks/useBusiness'
import { useIdentity } from '@/App'
import { formatKRW } from '@/lib/format'
import type { Transaction, TxType } from '@/types'

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function BusinessSheet(
  { open, onClose, editing }: { open: boolean; onClose: () => void; editing?: Transaction },
) {
  const who = useIdentity()
  const { data: cats = [] } = useBusinessCategories()
  const add = useAddBusinessTx()
  const update = useUpdateBusinessTx()

  const [type, setType] = useState<TxType>(editing?.type ?? 'expense')
  const [amount, setAmount] = useState<string>(editing ? String(editing.amount) : '')
  const [categoryId, setCategoryId] = useState<string | null>(editing?.category_id ?? null)
  const [date, setDate] = useState(editing?.date ?? today())
  const [memo, setMemo] = useState(editing?.memo ?? '')

  if (!open) return null
  const amt = Number(amount) || 0
  const visibleCats = cats.filter((c) => c.type === type)

  async function save() {
    if (amt <= 0 || !categoryId) return
    const payload = { who, type, amount: amt, category_id: categoryId, payment_method_id: null, date, memo, scope: 'business' as const }
    if (editing) await update.mutateAsync({ id: editing.id, ...payload })
    else await add.mutateAsync(payload)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md mx-auto bg-white rounded-t-3xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <span className="font-bold text-ink">{editing ? '사업 내역 수정' : '사업 입력'}</span>
          <button onClick={onClose} className="text-sub text-sm font-medium">닫기</button>
        </div>
        <div className="text-center text-3xl font-bold py-2 text-ink">{formatKRW(amt)}</div>
        <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric" placeholder="금액 입력"
          className="w-full text-center border-b border-card py-2 outline-none" autoFocus />
        <div className="flex bg-card rounded-2xl p-1">
          {(['expense', 'income'] as TxType[]).map((t) => (
            <button key={t} onClick={() => { setType(t); setCategoryId(null) }}
              className={`flex-1 py-2 rounded-xl text-sm font-bold ${type === t ? 'bg-white shadow text-ink' : 'text-sub'}`}>
              {t === 'expense' ? '지출' : '수입'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {visibleCats.map((c) => (
            <button key={c.id} onClick={() => setCategoryId(c.id)}
              className={`px-3 py-2 rounded-full text-sm font-medium ${categoryId === c.id ? 'bg-brand text-white' : 'bg-card text-ink'}`}>
              {c.name}
            </button>
          ))}
          {visibleCats.length === 0 && <span className="text-sub text-sm py-2">설정에서 사업 카테고리를 추가하세요</span>}
        </div>
        <div className="space-y-2 text-sm">
          <label className="flex justify-between items-center">
            <span className="text-sub">날짜</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-right outline-none text-ink" />
          </label>
          <label className="flex justify-between items-center">
            <span className="text-sub">메모</span>
            <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모" className="text-right outline-none text-ink" />
          </label>
        </div>
        <button onClick={save} disabled={amt <= 0 || !categoryId}
          className="w-full bg-brand disabled:bg-sub text-white rounded-2xl py-3 font-bold">저장하기</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2**: `src/components/TransferSheet.tsx` — 양방향 이체
```tsx
import { useState } from 'react'
import { useFundTransfer, useTransferCategoryId } from '@/hooks/useBusiness'
import { useIdentity } from '@/App'
import { formatKRW } from '@/lib/format'

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function TransferSheet(
  { open, onClose, direction }: { open: boolean; onClose: () => void; direction: 'to_business' | 'to_household' },
) {
  const who = useIdentity()
  const transfer = useFundTransfer()
  const { data: transferCatId } = useTransferCategoryId()
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today())
  const [memo, setMemo] = useState('')

  if (!open) return null
  const amt = Number(amount) || 0
  const title = direction === 'to_business' ? '사업자금 보내기' : '사업자금 받기(역이체)'

  async function save() {
    if (amt <= 0 || !transferCatId) return
    await transfer.mutateAsync({ direction, amount: amt, date, memo, who, transferCategoryId: transferCatId })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md mx-auto bg-white rounded-t-3xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <span className="font-bold text-ink">{title}</span>
          <button onClick={onClose} className="text-sub text-sm font-medium">닫기</button>
        </div>
        <p className="text-sub text-xs">
          {direction === 'to_business' ? '월급(가계)에서 사업자금으로 보냅니다. 가계 지출로 기록돼요.' : '사업자금에서 가계로 가져옵니다. 가계 수입으로 기록돼요.'}
        </p>
        <div className="text-center text-3xl font-bold py-2 text-ink">{formatKRW(amt)}</div>
        <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric" placeholder="금액 입력"
          className="w-full text-center border-b border-card py-2 outline-none" autoFocus />
        <div className="space-y-2 text-sm">
          <label className="flex justify-between items-center">
            <span className="text-sub">날짜</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-right outline-none text-ink" />
          </label>
          <label className="flex justify-between items-center">
            <span className="text-sub">메모</span>
            <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모" className="text-right outline-none text-ink" />
          </label>
        </div>
        <button onClick={save} disabled={amt <= 0 || !transferCatId}
          className="w-full bg-brand disabled:bg-sub text-white rounded-2xl py-3 font-bold">{title}</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3**: `src/screens/BusinessScreen.tsx`
```tsx
import { useState } from 'react'
import { useBusinessTransactions, useBusinessCategories, useFundData, useDeleteBusinessTx } from '@/hooks/useBusiness'
import { computeFundBalance } from '@/lib/businessFund'
import { computeSummary } from '@/lib/summary'
import { formatKRW } from '@/lib/format'
import { groupByDate } from '@/lib/grouping'
import { formatDayHeader } from '@/lib/date'
import TransactionRow from '@/components/TransactionRow'
import BusinessSheet from '@/components/BusinessSheet'
import TransferSheet from '@/components/TransferSheet'
import type { Transaction } from '@/types'

export default function BusinessScreen() {
  const now = new Date()
  const year = now.getFullYear(), month = now.getMonth() + 1
  const { data: txs = [] } = useBusinessTransactions(year, month)
  const { data: cats = [] } = useBusinessCategories()
  const { data: fund } = useFundData()
  const del = useDeleteBusinessTx()
  const catMap = new Map(cats.map((c) => [c.id, c]))
  const balance = fund ? computeFundBalance(fund.transfers, fund.business) : 0
  const s = computeSummary(txs)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [transfer, setTransfer] = useState<null | 'to_business' | 'to_household'>(null)
  const groups = groupByDate(txs)

  async function remove(id: string) {
    if (confirm('이 사업 내역을 삭제할까요?')) { await del.mutateAsync(id); setEditing(null) }
  }

  return (
    <div className="p-5 space-y-6">
      <div>
        <p className="text-sub text-sm">사업자금 잔액</p>
        <p className={`text-4xl font-bold mt-1 ${balance < 0 ? 'text-[#F04452]' : 'text-ink'}`}>{formatKRW(balance)}</p>
        {balance < 0 && <p className="text-[#F04452] text-xs mt-1">사업자금이 부족해요</p>}
      </div>

      <div className="flex gap-3">
        <button onClick={() => setTransfer('to_business')} className="flex-1 bg-card rounded-2xl py-3 font-semibold text-ink">사업자금 보내기</button>
        <button onClick={() => setTransfer('to_household')} className="flex-1 bg-card rounded-2xl py-3 font-semibold text-ink">받기</button>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 bg-card rounded-2xl p-4">
          <p className="text-sub text-xs">이번 달 수입</p>
          <p className="font-bold text-brand mt-1">{formatKRW(s.income)}</p>
        </div>
        <div className="flex-1 bg-card rounded-2xl p-4">
          <p className="text-sub text-xs">이번 달 지출</p>
          <p className="font-bold text-ink mt-1">{formatKRW(s.expense)}</p>
        </div>
      </div>

      <div>
        <p className="font-bold text-ink mb-1">{month}월 사업 내역</p>
        {groups.length === 0 && <p className="text-sub text-sm text-center py-8">사업 내역이 없어요</p>}
        {groups.map((g) => (
          <div key={g.date} className="mb-4">
            <p className="text-xs text-sub mb-1">{formatDayHeader(g.date)}</p>
            <div className="divide-y">
              {g.items.map((t) => (
                <TransactionRow key={t.id} tx={t} category={catMap.get(t.category_id ?? '')} onClick={() => setEditing(t)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 max-w-md w-14 h-14 rounded-full bg-brand text-white text-3xl shadow-lg flex items-center justify-center">+</button>

      <BusinessSheet open={open} onClose={() => setOpen(false)} />
      {transfer && <TransferSheet open onClose={() => setTransfer(null)} direction={transfer} />}
      {editing && (
        <>
          <BusinessSheet open onClose={() => setEditing(null)} editing={editing} />
          <button onClick={() => remove(editing.id)}
            className="fixed bottom-4 inset-x-5 max-w-md mx-auto z-[60] text-[#F04452] text-sm">이 내역 삭제</button>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 4**: `src/components/BottomNav.tsx` tabs 배열에 사업 추가(홈·내역·**사업**·설정 순):
```tsx
const tabs = [
  { to: '/', label: '홈' },
  { to: '/ledger', label: '내역' },
  { to: '/business', label: '사업' },
  { to: '/settings', label: '설정' },
]
```
- [ ] **Step 5**: `src/App.tsx` 라우트 추가. import `BusinessScreen`, `<Route path="/business" element={<BusinessScreen />} />` 추가.
- [ ] **Step 6**: `npx tsc --noEmit`, `npm run build`, `npx vitest run` 회귀 없음
- [ ] **Step 7**: 커밋
```bash
git add -A
git commit -m "feat: 사업 화면 + 양방향 이체 + 사업 입력 + 사업 탭

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task P2-5: 설정 — 사업 카테고리 관리

**Files:** Modify `src/screens/SettingsScreen.tsx`

**Interfaces:** Consumes `useBusinessCategories`, `useAddCategory`(scope 지정 필요), `useDeleteCategory`.

- [ ] **Step 1**: `useAddCategory`는 `Omit<Category,'id'>`를 받으므로 scope/is_fund_transfer 포함 가능. 설정에 "사업 카테고리" 섹션 추가: 사업 카테고리 목록(useBusinessCategories) + 추가(scope:'business', is_fund_transfer:false) + 삭제. 가계 카테고리 섹션은 그대로 두되, 추가 시 scope:'household', is_fund_transfer:false 명시.
  - 기존 가계 추가 호출 `addCat.mutate({ name, icon:'', type, is_fixed:false, sort_order:99 })` → `{ ..., scope:'household', is_fund_transfer:false }` 추가.
  - 사업 추가: 이름 + 지출/수입 선택 → `addCat.mutate({ name, icon:'', type, is_fixed:false, sort_order:99, scope:'business', is_fund_transfer:false })`.
- [ ] **Step 2**: `npx tsc --noEmit`, `npm run build` 성공, `npx vitest run` 회귀 없음
- [ ] **Step 3**: 커밋
```bash
git add src/screens/SettingsScreen.tsx
git commit -m "feat: 설정에 사업 카테고리 관리 추가

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review
- 스펙 커버리지: 마이그레이션(P2-1) · 잔액계산/타입(P2-2) · 스코프격리/사업훅/이체(P2-3) · 사업화면/이체시트/사업탭(P2-4) · 사업 카테고리 관리(P2-5) → 스펙 성공 기준 매핑.
- 타입 일관성: `scope`, `NewBizTx`, `computeFundBalance` 시그니처, 이체 mutation 파라미터 일치.
- 격리: 가계 useTransactions/useCategories scope='household' 필터. 사업 잔액은 useFundData 조인으로 is_fund_transfer만.
- 미해결 주의: `useCategories`에 `is_fund_transfer=false` 필터를 넣으면 가계 입력 시트에서 "사업자금 이체" 카테고리가 안 뜸(정상 — 이체는 전용 시트로만). 확인 필요.
