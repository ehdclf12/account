# 저축 목표 (⑤) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 부부가 저축 목표를 세우고, 가계부에서 저축 카테고리로 지출을 기록할 때 목표별로 누적 진행률을 볼 수 있게 한다.

**Architecture:** 고정비 관리와 동일한 패턴. `savings_goals` 테이블 + `transactions.savings_goal_id` 연결. 저축 카테고리(`categories.is_savings`) 선택 시 입력창에 목표 드롭다운이 뜨고, 목표별 "모은 금액" = 연결된 거래 금액의 전체 기간 누적 합. 집(household) 전용, 화면은 `/household/savings`.

**Tech Stack:** React 19 + TypeScript + Vite, @tanstack/react-query, Supabase, TailwindCSS. 순수 로직은 vitest로 TDD.

설계서: `docs/superpowers/specs/2026-07-06-savings-goals-design.md`

## Global Constraints

- 디자인 토큰만 사용: `bg-card`, `text-ink`, `text-sub`, `bg-brand`, `text-white`. 삭제 버튼 색 `#F04452`.
- 이모지 사용 안 함(기존 재스타일에서 제거됨).
- 인원별 분리 없음 — 목표별 합계만.
- 집(household) 전용 — 코스모스/business 화면 변경 없음.
- 금액은 `bigint`(원 단위 정수). 통화 표기는 `formatKRW`.
- 각 코드 태스크 완료 게이트: `npm run build` (= `tsc -b && vite build`) 와 `npm run test` (vitest) 통과.
- import 별칭 `@/` 사용(기존 관례).

## File Structure

신규:
- `supabase/schema-savings.sql` — 마이그레이션(사용자가 SQL Editor에서 실행)
- `src/lib/savings.ts` + `src/lib/savings.test.ts` — 진행률/월 적립 순수 계산
- `src/hooks/useSavingsGoals.ts` — 목표 CRUD + 진행 합계 훅
- `src/screens/SavingsManageScreen.tsx` — 목표 목록 화면
- `src/components/SavingsGoalSheet.tsx` — 목표 추가/편집 시트

수정:
- `src/types.ts` — `SavingsGoal`, `Category.is_savings`, `Transaction.savings_goal_id`
- `src/hooks/useTransactions.ts` — add/update/delete onSuccess에 `savings_progress` 무효화
- `src/hooks/useRealtime.ts` — transactions 변경 시 savings_progress 무효화 + savings_goals 구독
- `src/components/TransactionSheet.tsx` — 저축 카테고리 선택 시 목표 select + payload
- `src/screens/HomeScreen.tsx` — "저축 목표" 버튼
- `src/App.tsx` — `/household/savings` 라우트

---

### Task 1: 순수 계산 로직 (lib/savings.ts)

**Files:**
- Create: `src/lib/savings.ts`
- Test: `src/lib/savings.test.ts`

**Interfaces:**
- Consumes: 없음 (순수 함수, primitive 인자만)
- Produces:
  - `goalProgress(target: number, current: number): { pct: number; remaining: number }`
  - `monthsUntil(year: number, quarter: number | null, now: { year: number; month: number }): number`
  - `monthlyNeeded(remaining: number, year: number | null, quarter: number | null, now: { year: number; month: number }): number | null`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/lib/savings.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { goalProgress, monthsUntil, monthlyNeeded } from './savings'

describe('goalProgress', () => {
  it('진행 중', () => {
    expect(goalProgress(1000, 400)).toEqual({ pct: 40, remaining: 600 })
  })
  it('초과 시 pct 100, remaining 0', () => {
    expect(goalProgress(1000, 1200)).toEqual({ pct: 100, remaining: 0 })
  })
  it('목표액 0이면 pct 0', () => {
    expect(goalProgress(0, 0)).toEqual({ pct: 0, remaining: 0 })
  })
})

describe('monthsUntil', () => {
  const now = { year: 2026, month: 7 }
  it('분기 기한(2027 3분기 = 9월)', () => {
    expect(monthsUntil(2027, 3, now)).toBe(14)
  })
  it('연도 기한(2027 = 12월)', () => {
    expect(monthsUntil(2027, null, now)).toBe(17)
  })
  it('이미 지난 기한은 최소 1', () => {
    expect(monthsUntil(2026, 1, now)).toBe(1)
  })
})

describe('monthlyNeeded', () => {
  const now = { year: 2026, month: 7 }
  it('기한 없으면 null', () => {
    expect(monthlyNeeded(600, null, null, now)).toBeNull()
  })
  it('이미 달성(remaining<=0)이면 null', () => {
    expect(monthlyNeeded(0, 2027, 3, now)).toBeNull()
  })
  it('정상: remaining/개월 올림', () => {
    expect(monthlyNeeded(1400, 2027, 3, now)).toBe(100)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/savings.test.ts`
Expected: FAIL ("Failed to resolve import './savings'" 또는 함수 미정의)

- [ ] **Step 3: 최소 구현**

Create `src/lib/savings.ts`:
```ts
export function goalProgress(target: number, current: number): { pct: number; remaining: number } {
  const remaining = Math.max(0, target - current)
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  return { pct, remaining }
}

export function monthsUntil(
  year: number,
  quarter: number | null,
  now: { year: number; month: number },
): number {
  const endMonth = quarter ? quarter * 3 : 12
  const diff = (year * 12 + endMonth) - (now.year * 12 + now.month)
  return Math.max(1, diff)
}

export function monthlyNeeded(
  remaining: number,
  year: number | null,
  quarter: number | null,
  now: { year: number; month: number },
): number | null {
  if (year == null || remaining <= 0) return null
  return Math.ceil(remaining / monthsUntil(year, quarter, now))
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/savings.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/savings.ts src/lib/savings.test.ts
git commit -m "feat: 저축 목표 진행률·월 적립 계산 로직 (TDD)"
```

---

### Task 2: 스키마 마이그레이션 + 타입

**Files:**
- Create: `supabase/schema-savings.sql`
- Modify: `src/types.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `SavingsGoal` 인터페이스: `{ id: string; name: string; target_amount: number; target_year: number | null; target_quarter: number | null; active: boolean; created_at: string }`
  - `Category`에 `is_savings: boolean` 필드
  - `Transaction`에 `savings_goal_id?: string | null` 필드

- [ ] **Step 1: 마이그레이션 SQL 작성**

Create `supabase/schema-savings.sql`:
```sql
-- 저축 목표: 목표 테이블 + transactions.savings_goal_id 연결 + categories.is_savings.
-- Phase 1·2·예산·고정비 실행 후 SQL Editor에서 실행. 재실행해도 안전(idempotent).

create table if not exists savings_goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_amount bigint not null default 0 check (target_amount >= 0),
  target_year int check (target_year between 2020 and 2100),
  target_quarter int check (target_quarter between 1 and 4),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table transactions add column if not exists savings_goal_id
  uuid references savings_goals(id) on delete set null;

alter table categories add column if not exists is_savings boolean not null default false;

-- '저축' 가계 지출 카테고리 시드 (없을 때만)
insert into categories (name, icon, type, is_fixed, sort_order, scope, is_fund_transfer, is_savings)
select '저축', '', 'expense', false, 99, 'household', false, true
where not exists (select 1 from categories where scope = 'household' and is_savings = true);

alter table savings_goals enable row level security;
drop policy if exists auth_all on savings_goals;
create policy auth_all on savings_goals for all to authenticated using (true) with check (true);
```

- [ ] **Step 2: 타입 추가**

Modify `src/types.ts` — `Category` 인터페이스에 필드 추가(`is_fund_transfer` 아래):
```ts
  is_fund_transfer: boolean
  is_savings: boolean
```

`Transaction` 인터페이스에 필드 추가(`fixed_cost_id` 아래):
```ts
  fixed_cost_id?: string | null
  savings_goal_id?: string | null
```

`Budget` 인터페이스 아래에 새 인터페이스 추가:
```ts
export interface SavingsGoal {
  id: string
  name: string
  target_amount: number
  target_year: number | null
  target_quarter: number | null // 1..4, null=연도 목표
  active: boolean
  created_at: string
}
```

- [ ] **Step 3: 타입 컴파일 확인**

Run: `npx tsc -b`
Expected: 에러 없음 (기존 코드는 `is_savings`를 select * 로 받으므로 컴파일 영향 없음)

- [ ] **Step 4: 커밋**

```bash
git add supabase/schema-savings.sql src/types.ts
git commit -m "feat: 저축 목표 스키마 마이그레이션 + 타입"
```

---

### Task 3: 데이터 훅 (useSavingsGoals + 무효화)

**Files:**
- Create: `src/hooks/useSavingsGoals.ts`
- Modify: `src/hooks/useTransactions.ts`
- Modify: `src/hooks/useRealtime.ts`

**Interfaces:**
- Consumes: `SavingsGoal` (Task 2), supabase 클라이언트
- Produces:
  - `useSavingsGoals(): UseQueryResult<SavingsGoal[]>` — queryKey `['savings_goals']`
  - `useSavingsProgress(): UseQueryResult<Record<string, number>>` — queryKey `['savings_progress']`, goalId→누적합
  - `useAddSavingsGoal()` — `mutateAsync(Omit<SavingsGoal,'id'|'created_at'>)`
  - `useUpdateSavingsGoal()` — `mutateAsync(Partial<SavingsGoal> & { id: string })`
  - `useDeleteSavingsGoal()` — `mutateAsync(id: string)`

- [ ] **Step 1: 훅 파일 작성**

Create `src/hooks/useSavingsGoals.ts`:
```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { SavingsGoal } from '@/types'

export function useSavingsGoals() {
  return useQuery({
    queryKey: ['savings_goals'],
    queryFn: async (): Promise<SavingsGoal[]> => {
      const { data, error } = await supabase.from('savings_goals')
        .select('*').eq('active', true).order('created_at')
      if (error) throw error
      return data as SavingsGoal[]
    },
  })
}

export function useSavingsProgress() {
  return useQuery({
    queryKey: ['savings_progress'],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase.from('transactions')
        .select('savings_goal_id, amount').not('savings_goal_id', 'is', null)
      if (error) throw error
      const totals: Record<string, number> = {}
      for (const row of data as { savings_goal_id: string; amount: number }[]) {
        totals[row.savings_goal_id] = (totals[row.savings_goal_id] ?? 0) + row.amount
      }
      return totals
    },
  })
}

export function useAddSavingsGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (g: Omit<SavingsGoal, 'id' | 'created_at'>) => {
      const { error } = await supabase.from('savings_goals').insert(g)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savings_goals'] }),
  })
}

export function useUpdateSavingsGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (g: Partial<SavingsGoal> & { id: string }) => {
      const { id, ...rest } = g
      const { error } = await supabase.from('savings_goals').update(rest).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savings_goals'] }),
  })
}

export function useDeleteSavingsGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('savings_goals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savings_goals'] }),
  })
}
```

- [ ] **Step 2: 거래 mutation에 savings_progress 무효화 추가**

Modify `src/hooks/useTransactions.ts` — `useAddTransaction`, `useUpdateTransaction`, `useDeleteTransaction`의 `onSuccess`를 각각 아래로 교체:
```ts
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['savings_progress'] })
    },
```
(세 곳 모두 동일하게 변경)

- [ ] **Step 3: 실시간 구독 추가**

Modify `src/hooks/useRealtime.ts` — transactions 핸들러에 savings_progress 무효화를 추가하고, savings_goals 구독을 추가.

transactions 핸들러를 아래로 교체:
```ts
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' },
        () => {
          qc.invalidateQueries({ queryKey: ['transactions'] })
          qc.invalidateQueries({ queryKey: ['fund-data'] })
          qc.invalidateQueries({ queryKey: ['savings_progress'] })
        })
```

`fixed_costs` 구독 `.on(...)` 다음, `.subscribe()` 앞에 추가:
```ts
      .on('postgres_changes', { event: '*', schema: 'public', table: 'savings_goals' },
        () => qc.invalidateQueries({ queryKey: ['savings_goals'] }))
```

- [ ] **Step 4: 빌드·테스트 통과 확인**

Run: `npm run build && npm run test`
Expected: 빌드 성공, 모든 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add src/hooks/useSavingsGoals.ts src/hooks/useTransactions.ts src/hooks/useRealtime.ts
git commit -m "feat: 저축 목표 데이터 훅 + 진행 합계 무효화·실시간 구독"
```

---

### Task 4: 목표 시트 + 관리 화면 + 진입점

**Files:**
- Create: `src/components/SavingsGoalSheet.tsx`
- Create: `src/screens/SavingsManageScreen.tsx`
- Modify: `src/App.tsx`
- Modify: `src/screens/HomeScreen.tsx`

**Interfaces:**
- Consumes: `useSavingsGoals`, `useSavingsProgress`, `useAdd/Update/DeleteSavingsGoal` (Task 3), `goalProgress`, `monthlyNeeded` (Task 1), `formatKRW`, `SavingsGoal`
- Produces: 라우트 `/household/savings`; HomeScreen에 진입 버튼

- [ ] **Step 1: SavingsGoalSheet 작성**

Create `src/components/SavingsGoalSheet.tsx`:
```tsx
import { useState } from 'react'
import { useAddSavingsGoal, useUpdateSavingsGoal, useDeleteSavingsGoal } from '@/hooks/useSavingsGoals'
import type { SavingsGoal } from '@/types'

export default function SavingsGoalSheet(
  { open, onClose, editing }: { open: boolean; onClose: () => void; editing?: SavingsGoal },
) {
  const add = useAddSavingsGoal(); const upd = useUpdateSavingsGoal(); const del = useDeleteSavingsGoal()

  const [name, setName] = useState(editing?.name ?? '')
  const [amount, setAmount] = useState(editing ? String(editing.target_amount) : '')
  const [year, setYear] = useState<string>(editing?.target_year != null ? String(editing.target_year) : '')
  const [quarter, setQuarter] = useState<string>(editing?.target_quarter != null ? String(editing.target_quarter) : '')

  if (!open) return null

  const thisYear = new Date().getFullYear()
  const years = Array.from({ length: 8 }, (_, i) => thisYear + i)

  async function save() {
    const amt = Number(amount) || 0
    if (!name || amt <= 0) return
    const y = year ? Number(year) : null
    const payload = {
      name,
      target_amount: amt,
      target_year: y,
      target_quarter: y && quarter ? Number(quarter) : null,
      active: true,
    }
    if (editing) await upd.mutateAsync({ id: editing.id, ...payload })
    else await add.mutateAsync(payload)
    onClose()
  }

  async function remove() {
    if (editing && confirm('이 저축 목표를 삭제할까요?')) { await del.mutateAsync(editing.id); onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <span className="font-bold text-ink">{editing ? '저축 목표 수정' : '저축 목표 추가'}</span>
          <button onClick={onClose} className="text-sub text-sm font-medium">닫기</button>
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름 (예: 여행자금)" className="w-full bg-card rounded-xl px-3 py-2 outline-none" />
        <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="목표 금액" className="w-full bg-card rounded-xl px-3 py-2 outline-none" />
        <div>
          <p className="text-sub text-sm mb-1">기한 (선택)</p>
          <div className="flex gap-2">
            <select value={year} onChange={(e) => setYear(e.target.value)} className="flex-1 bg-card rounded-xl px-3 py-2 outline-none">
              <option value="">기한 없음</option>
              {years.map((y) => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select value={quarter} onChange={(e) => setQuarter(e.target.value)} disabled={!year} className="flex-1 bg-card rounded-xl px-3 py-2 outline-none disabled:opacity-50">
              <option value="">연말까지</option>
              {[1, 2, 3, 4].map((q) => <option key={q} value={q}>{q}분기</option>)}
            </select>
          </div>
        </div>
        <button onClick={save} className="w-full bg-brand text-white rounded-2xl py-3 font-bold">저장하기</button>
        {editing && <button onClick={remove} className="w-full text-[#F04452] text-sm py-1">삭제</button>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: SavingsManageScreen 작성**

Create `src/screens/SavingsManageScreen.tsx`:
```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSavingsGoals, useSavingsProgress } from '@/hooks/useSavingsGoals'
import { goalProgress, monthlyNeeded } from '@/lib/savings'
import { formatKRW } from '@/lib/format'
import SavingsGoalSheet from '@/components/SavingsGoalSheet'
import type { SavingsGoal } from '@/types'

export default function SavingsManageScreen() {
  const nav = useNavigate()
  const { data: goals = [] } = useSavingsGoals()
  const { data: progress = {} } = useSavingsProgress()
  const [editing, setEditing] = useState<SavingsGoal | null>(null)
  const [adding, setAdding] = useState(false)

  const now = new Date()
  const nowRef = { year: now.getFullYear(), month: now.getMonth() + 1 }

  function deadlineLabel(g: SavingsGoal): string {
    if (g.target_year == null) return ''
    return g.target_quarter ? `${g.target_year}년 ${g.target_quarter}분기까지` : `${g.target_year}년까지`
  }

  return (
    <div className="p-5 space-y-5">
      <button onClick={() => nav('/household')} className="text-sub text-sm">‹ 집</button>
      <h1 className="text-xl font-bold text-ink">저축 목표</h1>

      <div className="space-y-3">
        {goals.length === 0 && <p className="text-sub text-sm text-center py-6">등록된 저축 목표가 없어요</p>}
        {goals.map((g) => {
          const current = progress[g.id] ?? 0
          const { pct, remaining } = goalProgress(g.target_amount, current)
          const monthly = monthlyNeeded(remaining, g.target_year, g.target_quarter, nowRef)
          return (
            <button key={g.id} onClick={() => setEditing(g)}
              className="w-full text-left bg-card rounded-2xl p-4 active:opacity-70">
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-ink">{g.name}</span>
                <span className="text-sub text-sm">{pct}%</span>
              </div>
              <div className="h-2 bg-white rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-ink">{formatKRW(current)} / {formatKRW(g.target_amount)}</span>
                <span className="text-sub">{remaining > 0 ? `${formatKRW(remaining)} 남음` : '달성!'}</span>
              </div>
              {(deadlineLabel(g) || monthly) && (
                <p className="text-sub text-xs mt-1">
                  {monthly ? `월 약 ${formatKRW(monthly)}씩` : ''}{monthly && deadlineLabel(g) ? ' · ' : ''}{deadlineLabel(g)}
                </p>
              )}
            </button>
          )
        })}
      </div>

      <button onClick={() => setAdding(true)} className="w-full bg-brand text-white rounded-2xl py-3 font-bold">저축 목표 추가</button>

      {adding && <SavingsGoalSheet open onClose={() => setAdding(false)} />}
      {editing && <SavingsGoalSheet open onClose={() => setEditing(null)} editing={editing} />}
    </div>
  )
}
```

- [ ] **Step 3: 라우트 등록**

Modify `src/App.tsx`:
- import 추가(다른 화면 import 아래):
```tsx
import SavingsManageScreen from '@/screens/SavingsManageScreen'
```
- `/household/fixed` Route 아래에 추가:
```tsx
            <Route path="/household/savings" element={<SavingsManageScreen />} />
```

- [ ] **Step 4: 집 화면에 진입 버튼**

Modify `src/screens/HomeScreen.tsx` — "고정비 관리" 버튼 블록 바로 아래에 추가:
```tsx
      <button onClick={() => nav('/household/savings')}
        className="w-full bg-card rounded-2xl py-3 font-semibold text-ink flex justify-between items-center px-4">
        <span>저축 목표</span><span className="text-sub">›</span>
      </button>
```

- [ ] **Step 5: 빌드·테스트 통과 확인**

Run: `npm run build && npm run test`
Expected: 빌드 성공, 모든 테스트 PASS

- [ ] **Step 6: 커밋**

```bash
git add src/components/SavingsGoalSheet.tsx src/screens/SavingsManageScreen.tsx src/App.tsx src/screens/HomeScreen.tsx
git commit -m "feat: 저축 목표 관리 화면 + 추가/편집 시트 + 집 화면 진입"
```

---

### Task 5: 입력창 저축 목표 연동 (TransactionSheet)

**Files:**
- Modify: `src/components/TransactionSheet.tsx`

**Interfaces:**
- Consumes: `useSavingsGoals` (Task 3), `Category.is_savings` (Task 2), `Transaction.savings_goal_id`
- Produces: 저축 카테고리 선택 시 목표 select; 저장 payload에 `savings_goal_id` 포함

- [ ] **Step 1: 목표 훅·상태 추가**

Modify `src/components/TransactionSheet.tsx`:
- import 추가:
```tsx
import { useSavingsGoals } from '@/hooks/useSavingsGoals'
```
- 훅 호출부(`const del = useDeleteTransaction()` 아래)에 추가:
```tsx
  const { data: goals = [] } = useSavingsGoals()
```
- 상태 추가(`const [memo, setMemo] = ...` 아래):
```tsx
  const [savingsGoalId, setSavingsGoalId] = useState<string | null>(editing?.savings_goal_id ?? null)
```
- `const visibleCats = ...` 아래에 파생값 추가:
```tsx
  const selectedCat = cats.find((c) => c.id === categoryId)
  const isSavings = selectedCat?.is_savings ?? false
```

- [ ] **Step 2: 저장 로직에 savings_goal_id 반영**

`save()` 안의 `payload`와 가드를 아래로 교체:
```tsx
  async function save() {
    if (amt <= 0 || !categoryId) return
    if (isSavings && !savingsGoalId) return
    const payload = {
      who, type, amount: amt, category_id: categoryId, payment_method_id: pmId,
      date, memo, scope: 'household' as const,
      savings_goal_id: isSavings ? savingsGoalId : null,
    }
    if (editing) await update.mutateAsync({ id: editing.id, ...payload })
    else await add.mutateAsync(payload)
    onClose()
  }
```

- [ ] **Step 3: 목표 선택 UI 추가**

카테고리 칩 목록(`<div className="flex flex-wrap gap-2">...</div>`) 바로 아래에 추가:
```tsx
        {isSavings && (
          goals.length === 0 ? (
            <p className="text-sub text-sm">먼저 저축 목표를 추가하세요</p>
          ) : (
            <label className="flex justify-between items-center text-sm">
              <span className="text-sub">목표</span>
              <select value={savingsGoalId ?? ''} onChange={(e) => setSavingsGoalId(e.target.value || null)} className="text-right outline-none text-ink">
                <option value="">선택</option>
                {goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
          )
        )}
```

- [ ] **Step 4: 저장 버튼 비활성 조건 갱신**

저장 버튼의 `disabled`를 아래로 교체:
```tsx
        <button onClick={save} disabled={amt <= 0 || !categoryId || (isSavings && !savingsGoalId)}
          className="w-full bg-brand disabled:bg-sub text-white rounded-2xl py-3 font-bold">
          저장하기
        </button>
```

- [ ] **Step 5: 빌드·테스트 통과 확인**

Run: `npm run build && npm run test`
Expected: 빌드 성공, 모든 테스트 PASS

- [ ] **Step 6: 커밋**

```bash
git add src/components/TransactionSheet.tsx
git commit -m "feat: 입력창 저축 카테고리 선택 시 목표 연동"
```

---

## 실행 후 확인 (사용자 몫)

1. Supabase SQL Editor에서 `supabase/schema-savings.sql` 실행.
2. 집 화면 → "저축 목표" → 목표 추가(예: 여행자금 300만, 2027년 3분기).
3. 입력창에서 지출 → "저축" 카테고리 → 목표 선택 → 저장 → 관리 화면 진행률 반영 확인.
4. 두 폰(동욱/도영) 실시간 반영 확인.

## Self-Review 결과

- **Spec coverage:** 핵심 동작(카테고리→목표), 위치(집 화면 버튼/라우트), 데이터 모델(3개 스키마 변경), 순수 로직(goalProgress/monthsUntil/monthlyNeeded), 훅 5종, 화면·시트, 입력창 연동 — 모두 태스크에 매핑됨. ⑥ 연결 지점은 "데이터만 마련"이라 useSavingsProgress로 충족.
- **Placeholder scan:** 없음. 모든 코드 스텝에 실제 코드 포함.
- **Type consistency:** `SavingsGoal` 필드, `savings_goal_id`, `is_savings`, 훅 시그니처, queryKey(`savings_goals`/`savings_progress`) 태스크 간 일치 확인.
