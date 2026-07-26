# 시간관리 목표 & 명언 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Time 화면 "블럭 선택" 위에 체크 가능한 목표(대목표 여러 개 + 서브목표)와 고정 명언 1개를 개인별로 추가한다.

**Architecture:** 아카이브 체크리스트 카드와 같은 패턴 — 서브목표를 정규화하지 않고 대목표 한 행의 `checklist` JSONB에 담아 통째 갱신한다. 데이터는 `who`로 분리, TanStack Query + realtime 무효화. 목표 UI는 별도 컴포넌트(`TimeGoals`)로 분리해 `TimeScreen`이 커지지 않게 한다.

**Tech Stack:** React 19 + Vite + TypeScript, Supabase(Postgres, RLS, realtime), TanStack Query, Tailwind(디자인 토큰).

## Global Constraints

- 기록은 **개인별**이다 — 모든 쿼리/뮤테이션은 `useIdentity()`의 `who`로 스코프한다.
- 마이그레이션 SQL은 앱이 실행하지 않는다 — 파일만 만들고 **사용자가 Supabase SQL Editor에서 수동 실행**한다(재실행 안전/idempotent).
- 진행률은 파생값이다 — 기존 `checklistProgress(items)`(`src/lib/archive.ts`)를 재사용하고 새 컬럼/함수를 만들지 않는다.
- 서브목표 추가·체크·삭제·이름수정은 전부 `useUpdateGoal({ id, checklist })`로 `checklist` 배열을 통째 저장한다.
- Tailwind 토큰만 쓴다: `bg-card` `bg-surface` `bg-dim` `bg-brand` `text-ink` `text-sub` `text-bg` `text-brand` `text-danger` `border-line`.
- 삭제는 아카이브·블럭과 마찬가지로 `confirm()`으로 확인한다.
- 이 프로젝트는 React 컴포넌트 단위 테스트를 두지 않는다(테스트는 `src/lib/*.test.ts` 순수 함수만). UI 태스크의 검증은 `npm run build`(= `tsc -b && vite build`) + 수동 확인으로 한다.

---

### Task 1: 스키마 + 타입

**Files:**
- Create: `supabase/schema-time-goals.sql`
- Modify: `src/types.ts` (`ChecklistEntry` 인터페이스 아래, `TimeBlock` 근처에 추가)

**Interfaces:**
- Consumes: 기존 `ChecklistEntry { text: string; done: boolean }`, `Role`
- Produces: `TimeGoal { id: string; who: Role; title: string; checklist: ChecklistEntry[]; sort_order: number; created_at: string }`; DB 테이블 `time_goals`, `time_quotes`

- [ ] **Step 1: 스키마 파일 작성**

Create `supabase/schema-time-goals.sql`:

```sql
-- 시간관리 3차: 목표(체크 가능한 대목표 + 서브목표 체크리스트) + 고정 명언.
-- schema-time-groups.sql 실행 후 SQL Editor에서 실행. 재실행해도 안전(idempotent).

create table if not exists time_goals (
  id uuid primary key default gen_random_uuid(),
  who text not null check (who in ('husband','wife')),
  title text not null check (char_length(title) between 1 and 40),
  checklist jsonb not null default '[]'::jsonb,   -- ChecklistEntry[] { text, done }
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists time_goals_who on time_goals (who, sort_order);

alter table time_goals enable row level security;
drop policy if exists household_only on time_goals;
create policy household_only on time_goals for all to authenticated
  using (public.is_household_member()) with check (public.is_household_member());

-- 명언: 사람당 한 행(who PK). 없으면 행이 없고, 앱은 빈 문자열로 취급한다.
create table if not exists time_quotes (
  who text primary key check (who in ('husband','wife')),
  text text not null default '',
  updated_at timestamptz not null default now()
);

alter table time_quotes enable row level security;
drop policy if exists household_only on time_quotes;
create policy household_only on time_quotes for all to authenticated
  using (public.is_household_member()) with check (public.is_household_member());

do $$
begin
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'time_goals') then
    alter publication supabase_realtime add table public.time_goals;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'time_quotes') then
    alter publication supabase_realtime add table public.time_quotes;
  end if;
end $$;
```

- [ ] **Step 2: 타입 추가**

Modify `src/types.ts` — 파일 끝(`TimeSession` 인터페이스 아래)에 추가:

```ts
export interface TimeGoal {
  id: string
  who: Role
  title: string
  checklist: ChecklistEntry[]   // 서브목표
  sort_order: number
  created_at: string
}
```

(`ChecklistEntry`, `Role`는 같은 파일에 이미 있으니 새로 만들지 않는다.)

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음(exit 0).

- [ ] **Step 4: 커밋**

```bash
git add supabase/schema-time-goals.sql src/types.ts
git commit -m "feat(time): 목표/명언 스키마 + TimeGoal 타입"
```

> ⚠️ 사용자에게 안내: `supabase/schema-time-goals.sql`을 Supabase SQL Editor에서 실행해야 이후 태스크가 실제로 동작한다(빌드/타입체크는 실행 없이도 통과).

---

### Task 2: 데이터 훅 + realtime

**Files:**
- Create: `src/hooks/useTimeGoals.ts`
- Modify: `src/hooks/useRealtime.ts` (`time_sessions` 구독 라인 아래, `.subscribe()` 앞)

**Interfaces:**
- Consumes: `TimeGoal`, `ChecklistEntry` (Task 1), `useIdentity` (`@/App`), `supabase` (`@/lib/supabase`)
- Produces:
  - `useTimeGoals(): UseQueryResult<TimeGoal[]>`
  - `useAddGoal()` — `mutateAsync({ title: string; sort_order: number })`
  - `useUpdateGoal()` — `mutateAsync({ id: string; title?: string; checklist?: ChecklistEntry[]; sort_order?: number })`
  - `useDeleteGoal()` — `mutateAsync(id: string)`
  - `useQuote(): UseQueryResult<string>`
  - `useSetQuote()` — `mutateAsync(text: string)`
  - queryKeys: `['time_goals', who]`, `['time_quote', who]`

- [ ] **Step 1: 훅 파일 작성**

Create `src/hooks/useTimeGoals.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useIdentity } from '@/App'
import type { ChecklistEntry, TimeGoal } from '@/types'

export function useTimeGoals() {
  const who = useIdentity()
  return useQuery({
    queryKey: ['time_goals', who],
    queryFn: async (): Promise<TimeGoal[]> => {
      const { data, error } = await supabase.from('time_goals')
        .select('*').eq('who', who)
        .order('sort_order').order('created_at')
      if (error) throw error
      return data as TimeGoal[]
    },
  })
}

export function useAddGoal() {
  const qc = useQueryClient(); const who = useIdentity()
  return useMutation({
    mutationFn: async (g: { title: string; sort_order: number }) => {
      const { error } = await supabase.from('time_goals').insert({ ...g, who, checklist: [] })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_goals', who] }),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient(); const who = useIdentity()
  return useMutation({
    mutationFn: async (
      { id, ...rest }: { id: string; title?: string; checklist?: ChecklistEntry[]; sort_order?: number },
    ) => {
      const { error } = await supabase.from('time_goals').update(rest).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_goals', who] }),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient(); const who = useIdentity()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('time_goals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_goals', who] }),
  })
}

export function useQuote() {
  const who = useIdentity()
  return useQuery({
    queryKey: ['time_quote', who],
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase.from('time_quotes')
        .select('text').eq('who', who).maybeSingle()
      if (error) throw error
      return (data?.text as string | undefined) ?? ''
    },
  })
}

export function useSetQuote() {
  const qc = useQueryClient(); const who = useIdentity()
  return useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase.from('time_quotes')
        .upsert({ who, text, updated_at: new Date().toISOString() }, { onConflict: 'who' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_quote', who] }),
  })
}
```

- [ ] **Step 2: realtime 구독 추가**

Modify `src/hooks/useRealtime.ts` — `time_sessions` 라인(`.on(... table: 'time_sessions' ...)`) 바로 아래에 추가:

```ts
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_goals' },
        () => qc.invalidateQueries({ queryKey: ['time_goals'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_quotes' },
        () => qc.invalidateQueries({ queryKey: ['time_quote'] }))
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음(exit 0).

- [ ] **Step 4: 커밋**

```bash
git add src/hooks/useTimeGoals.ts src/hooks/useRealtime.ts
git commit -m "feat(time): 목표/명언 데이터 훅 + realtime 구독"
```

---

### Task 3: 목표 카드 UI + TimeScreen 삽입

**Files:**
- Create: `src/components/TimeGoalSheet.tsx`
- Create: `src/components/TimeGoals.tsx`
- Modify: `src/screens/TimeScreen.tsx` (import 추가 + 블럭 카드 위에 `<TimeGoals />` 삽입)

**Interfaces:**
- Consumes: Task 2 훅 전부, `checklistProgress` (`@/lib/archive`), `showToast` (`@/lib/toast`), `TimeGoal`/`ChecklistEntry` (Task 1)
- Produces: `TimeGoals` (기본 export, props 없음), `TimeGoalSheet` (기본 export, `{ open, onClose, editing?, nextOrder }`)

- [ ] **Step 1: 목표 추가/수정 시트 작성**

Create `src/components/TimeGoalSheet.tsx` (블럭 시트와 같은 결):

```tsx
import { useState } from 'react'
import { useAddGoal, useUpdateGoal, useDeleteGoal } from '@/hooks/useTimeGoals'
import { showToast } from '@/lib/toast'
import type { TimeGoal } from '@/types'

const TITLE_MAX = 40

export default function TimeGoalSheet(
  { open, onClose, editing, nextOrder }:
  { open: boolean; onClose: () => void; editing?: TimeGoal; nextOrder: number },
) {
  const add = useAddGoal(); const upd = useUpdateGoal(); const del = useDeleteGoal()
  const [title, setTitle] = useState(editing?.title ?? '')

  if (!open) return null

  async function save() {
    const t = title.trim()
    if (!t) { showToast('목표를 입력해 주세요.'); return }
    try {
      if (editing) await upd.mutateAsync({ id: editing.id, title: t })
      else await add.mutateAsync({ title: t, sort_order: nextOrder })
      onClose()
    } catch { /* 실패 시 시트를 열어둔다(사유는 전역 토스트로 안내) */ }
  }

  async function remove() {
    if (!editing) return
    if (!confirm(`'${editing.title}' 목표를 삭제할까요?\n서브목표도 함께 지워집니다.`)) return
    try { await del.mutateAsync(editing.id); onClose() } catch { /* 전역 토스트 */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dim" onClick={onClose}>
      <div className="w-full max-w-md bg-surface rounded-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <button onClick={onClose} className="text-sub text-sm font-medium">닫기</button>
          <span className="font-bold text-ink">{editing ? '목표 수정' : '목표 추가'}</span>
          <button onClick={save} className="text-brand text-sm font-bold">확인</button>
        </div>
        <div>
          <label className="text-sub text-xs font-bold">목표</label>
          <div className="flex items-center gap-2 bg-card rounded-xl px-3 mt-1.5">
            <input value={title} maxLength={TITLE_MAX} autoFocus
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              placeholder="예: 사업 매출 1억" className="flex-1 bg-transparent py-2.5 outline-none text-ink" />
            <span className="text-sub text-xs shrink-0">{title.length}/{TITLE_MAX}</span>
          </div>
        </div>
        {editing && <button onClick={remove} className="w-full text-danger text-sm py-1">삭제</button>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 목표 카드 작성**

Create `src/components/TimeGoals.tsx`:

```tsx
import { useState } from 'react'
import { useTimeGoals, useUpdateGoal, useQuote, useSetQuote } from '@/hooks/useTimeGoals'
import { checklistProgress } from '@/lib/archive'
import TimeGoalSheet from '@/components/TimeGoalSheet'
import type { ChecklistEntry, TimeGoal } from '@/types'

const QUOTE_MAX = 60
const SUB_MAX = 40

export default function TimeGoals() {
  const { data: goals = [] } = useTimeGoals()
  const { data: quote = '' } = useQuote()
  const upd = useUpdateGoal()
  const setQuote = useSetQuote()

  const [editMode, setEditMode] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const [editingGoal, setEditingGoal] = useState<TimeGoal | null>(null)
  const [quoteDraft, setQuoteDraft] = useState<string | null>(null)   // null = 편집 안 함
  const [sub, setSub] = useState<{ id: string; text: string } | null>(null)  // 서브목표 추가 입력

  function toggleExpand(id: string) {
    setExpanded((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  // 서브목표는 체크리스트를 통째로 저장한다(아카이브 패턴과 동일)
  async function saveChecklist(g: TimeGoal, checklist: ChecklistEntry[]) {
    try { await upd.mutateAsync({ id: g.id, checklist }) } catch { /* 전역 토스트 */ }
  }
  function toggleSub(g: TimeGoal, i: number) {
    void saveChecklist(g, g.checklist.map((c, idx) => (idx === i ? { ...c, done: !c.done } : c)))
  }
  function deleteSub(g: TimeGoal, i: number) {
    void saveChecklist(g, g.checklist.filter((_, idx) => idx !== i))
  }
  function addSub(g: TimeGoal) {
    const t = sub?.id === g.id ? sub.text.trim() : ''
    if (!t) return
    void saveChecklist(g, [...g.checklist, { text: t, done: false }])
    setSub({ id: g.id, text: '' })
  }

  async function saveQuote() {
    try { await setQuote.mutateAsync((quoteDraft ?? '').trim()); setQuoteDraft(null) }
    catch { /* 전역 토스트 */ }
  }

  return (
    <div className="bg-card rounded-2xl p-4 space-y-4">
      {/* 명언 */}
      {quoteDraft !== null ? (
        <div className="flex items-center gap-2">
          <input value={quoteDraft} maxLength={QUOTE_MAX} autoFocus
            onChange={(e) => setQuoteDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveQuote()}
            placeholder="나만의 명언을 적어보세요"
            className="flex-1 bg-surface rounded-xl px-3 py-2 outline-none text-ink text-sm" />
          <button onClick={saveQuote} className="text-brand text-sm font-bold px-1">저장</button>
          <button onClick={() => setQuoteDraft(null)} className="text-sub text-sm px-1">취소</button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm italic min-w-0 truncate ${quote ? 'text-ink' : 'text-sub/60'}`}>
            {quote ? `“${quote}”` : '나만의 명언을 적어보세요'}
          </p>
          {editMode && (
            <button onClick={() => setQuoteDraft(quote)} aria-label="명언 수정"
              className="text-sub text-sm shrink-0 active:opacity-60">✎</button>
          )}
        </div>
      )}

      <div className="border-t border-line" />

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <span className="font-bold text-ink">목표</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setEditMode((v) => !v)}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium ${editMode ? 'bg-ink text-bg' : 'bg-surface text-sub'}`}>
            {editMode ? '완료' : '편집'}
          </button>
          <button onClick={() => setAdding(true)} aria-label="목표 추가"
            className="text-ink text-2xl leading-none w-8 h-8 flex items-center justify-center active:opacity-60">+</button>
        </div>
      </div>

      {/* 목표 리스트 */}
      {goals.length === 0 ? (
        <p className="text-sub text-sm text-center py-4">세우고 싶은 목표를 적어보세요</p>
      ) : (
        <div className="space-y-2.5">
          {goals.map((g) => {
            const { done, total } = checklistProgress(g.checklist)
            const open = expanded.has(g.id)
            const pct = total ? Math.round((done / total) * 100) : 0
            return (
              <div key={g.id} className="bg-surface rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleExpand(g.id)}
                    className="flex-1 min-w-0 flex items-center gap-2 text-left active:opacity-70">
                    <span className="text-sub text-xs w-3 shrink-0">{open ? '▾' : '▸'}</span>
                    <span className="text-ink font-medium truncate">{g.title}</span>
                  </button>
                  {total > 0 && <span className="text-sub text-xs shrink-0">{done}/{total}</span>}
                  {editMode && (
                    <button onClick={() => setEditingGoal(g)} aria-label={`${g.title} 수정`}
                      className="text-sub text-sm shrink-0 active:opacity-60">✎</button>
                  )}
                </div>
                {total > 0 && (
                  <div className="mt-2 h-1 rounded-full bg-line overflow-hidden">
                    <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                )}
                {open && (
                  <div className="mt-3 space-y-2">
                    {g.checklist.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <button onClick={() => toggleSub(g, i)}
                          className="flex items-center gap-2 flex-1 min-w-0 text-left active:opacity-70">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 ${c.done ? 'bg-brand text-white' : 'bg-card text-transparent border border-sub/30'}`}>✓</span>
                          <span className={`text-sm truncate ${c.done ? 'text-sub line-through' : 'text-ink'}`}>{c.text}</span>
                        </button>
                        {editMode && (
                          <button onClick={() => deleteSub(g, i)} aria-label={`${c.text} 삭제`}
                            className="text-sub text-sm shrink-0 active:opacity-60">×</button>
                        )}
                      </div>
                    ))}
                    {editMode && (
                      <div className="flex items-center gap-2">
                        <input value={sub?.id === g.id ? sub.text : ''} maxLength={SUB_MAX}
                          onChange={(e) => setSub({ id: g.id, text: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && addSub(g)}
                          placeholder="+ 서브목표 추가"
                          className="flex-1 bg-card rounded-lg px-3 py-1.5 outline-none text-ink text-sm" />
                        <button onClick={() => addSub(g)} className="text-brand text-sm font-bold px-1">추가</button>
                      </div>
                    )}
                    {g.checklist.length === 0 && !editMode && (
                      <p className="text-sub/60 text-xs">아직 서브목표가 없어요</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {adding && <TimeGoalSheet open onClose={() => setAdding(false)} nextOrder={goals.length} />}
      {editingGoal && <TimeGoalSheet open onClose={() => setEditingGoal(null)} editing={editingGoal} nextOrder={goals.length} />}
    </div>
  )
}
```

- [ ] **Step 3: TimeScreen에 삽입**

Modify `src/screens/TimeScreen.tsx`:

import 블록에 추가(다른 컴포넌트 import들 근처):

```tsx
import TimeGoals from '@/components/TimeGoals'
```

블럭 선택 카드(`<div className="bg-card rounded-2xl p-4 space-y-5">`) **바로 앞**에 삽입:

```tsx
      <TimeGoals />

      <div className="bg-card rounded-2xl p-4 space-y-5">
```

(오늘/이번 주 요약 및 진행 중 타이머 카드 아래, 블럭 선택 위에 온다.)

- [ ] **Step 4: 빌드 + 기존 테스트**

Run: `npm run build`
Expected: 타입 에러/빌드 에러 없이 완료.

Run: `npm test`
Expected: 기존 테스트 전부 통과(새 실패 없음).

- [ ] **Step 5: 수동 확인 (dev 서버)**

Run: `npm run dev` — Time 화면에서 확인:
- 목표 카드가 "블럭 선택" 위에 보인다. 명언 자리에 "나만의 명언을 적어보세요"(비었을 때).
- `+` → 목표 추가 시트 → 제목 저장 → 목표가 리스트에 나타난다.
- 목표 탭 → 펼침(▾)/접힘(▸) 토글.
- `편집` → 목표 우측 ✎(수정 시트), 명언 우측 ✎.
- 편집 모드에서 펼친 목표에 "+ 서브목표 추가" 입력 → 추가 → 진행바/`done/total` 갱신.
- 서브목표 탭 → 체크/해제, 취소선. `×` → 삭제(편집 모드).
- 명언 ✎ → 입력 → 저장 → `"..."` 표시.
- 목표 삭제(수정 시트의 삭제) → confirm 후 사라짐.
- 다른 기기/새로고침에서 realtime로 반영(선택 확인).

- [ ] **Step 6: 커밋**

```bash
git add src/components/TimeGoals.tsx src/components/TimeGoalSheet.tsx src/screens/TimeScreen.tsx
git commit -m "feat(time): 목표 카드(대목표+서브목표 체크) + 고정 명언"
```

---

## Self-Review

**Spec coverage:**
- 체크 가능한 목표 → Task 3 `toggleSub` ✓
- 대목표 여러 개 + 각각 서브목표 → `time_goals` 다중 행 + `checklist` (Task 1/3) ✓
- 고정 명언 1개 → `time_quotes`(who PK) + 명언 라인/편집 (Task 1/2/3) ✓
- 대목표 기본 접힘 → `expanded` 기본 빈 Set (Task 3) ✓
- 블럭 선택 위 배치 → Task 3 Step 3 ✓
- 개인별(who) 분리 → 모든 훅 `who` 스코프 (Task 2) ✓
- 아카이브 체크리스트 패턴 재사용 → `checklist` JSONB + `checklistProgress` ✓
- 편집 모드(블럭 선택과 동일 결) → Task 3 `editMode` 토글 + `+`/✎/× ✓
- 별도 컴포넌트/훅 분리 → `TimeGoals`/`TimeGoalSheet`/`useTimeGoals` ✓
- realtime → Task 2 Step 2 ✓

**Placeholder scan:** 모든 스텝에 실제 코드/명령/기대결과 있음. TBD/TODO 없음.

**Type consistency:** `TimeGoal`/`ChecklistEntry` 필드명(`title`/`checklist`/`text`/`done`)이 Task 1↔2↔3에서 일치. 훅 시그니처(`useUpdateGoal({ id, checklist })` 등)가 Task 3 사용처와 일치. 쿼리키 `['time_goals', who]`/`['time_quote', who]`가 훅과 realtime에서 일치.
