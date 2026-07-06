# 저축 목표 (⑤) — 설계서

작성일: 2026-07-06
로드맵: 가계부 고도화 ⑤ 저축 목표
선행: ① 예산 ② 통계 ③ 고정비 (완료). ④ 캘린더 뷰는 사용자 요청으로 보류, ⑥ 자산현황은 마지막.

## 목적

부부가 공동 저축 목표(예: 여행자금, 비상금)를 세우고, 가계부에 저축을 기록할 때마다
그 목표에 자동으로 쌓여 진행률을 볼 수 있게 한다. 각 목표의 누적 총합은 나중에
⑥ 자산현황의 순자산에 합산될 기반이 된다.

## 핵심 동작

- 가계부 입력창에서 **저축 카테고리**를 선택하면 그 아래 **"목표 선택"** 드롭다운이 나타난다.
- 저장 시 해당 거래(지출)에 `savings_goal_id`가 연결된다.
- 각 목표의 "모은 금액" = 그 목표에 연결된 거래 금액의 **전체 기간 누적 합계**.
- 저축은 **지출 카테고리**로 취급한다 → 저축한 만큼 "이번 달 남은 돈"이 줄어든다
  (실제 쓸 수 있는 돈에서 빠졌으므로 올바름).

## 범위 결정 (확정)

- **위치**: 고정비 관리와 동일하게 `예산관리 > 집` 화면에 "저축 목표" 버튼 → `/household/savings`.
- **집(household) 전용**. 코스모스(사업)는 사업자금 흐름이 따로 있어 제외.
- **인원별 분리 없음**. 목표별 합계만 표시.
- **기한 단위 = 연도(+선택적 분기)**. 정확한 날짜가 아니라 `2027년` 또는 `2027년 3분기`.
  기한이 있으면 "월 약 ₩X씩 모으면 달성" 안내를 계산해 보여준다.
- 인출/완료 처리는 이번 범위 밖(YAGNI). 목표는 편집·삭제 가능. 달성 시 진행바 100%로 표시.

## 데이터 모델 (Supabase)

새 마이그레이션 파일 `supabase/schema-savings.sql` (idempotent, 사용자가 SQL Editor에서 실행):

```sql
create table if not exists savings_goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_amount bigint not null default 0 check (target_amount >= 0),
  target_year int check (target_year between 2020 and 2100),   -- nullable = 기한 없음
  target_quarter int check (target_quarter between 1 and 4),    -- nullable = 연도 목표
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table transactions add column if not exists savings_goal_id
  uuid references savings_goals(id) on delete set null;

alter table categories add column if not exists is_savings boolean not null default false;

-- '저축' 가계 지출 카테고리 시드 (없을 때만)
insert into categories (name, icon, type, is_fixed, sort_order, scope, is_fund_transfer, is_savings)
select '저축', '', 'expense', false, 99, 'household', false, true
where not exists (select 1 from categories where scope='household' and is_savings=true);

alter table savings_goals enable row level security;
drop policy if exists auth_all on savings_goals;
create policy auth_all on savings_goals for all to authenticated using (true) with check (true);
```

`target_year`가 null이면 기한 없는 목표. `target_year`는 있고 `target_quarter`가 null이면 연도 목표.

## 타입 (`src/types.ts`)

```ts
export interface SavingsGoal {
  id: string
  name: string
  target_amount: number
  target_year: number | null
  target_quarter: number | null   // 1..4
  active: boolean
  created_at: string
}
```
- `Category`에 `is_savings: boolean` 추가.
- `Transaction`에 `savings_goal_id?: string | null` 추가.

## 순수 로직 (`src/lib/savings.ts`, TDD 단위 테스트)

- `goalProgress(target: number, current: number)` → `{ pct, remaining }`
  - `pct` = target>0 ? min(100, round(current/target*100)) : 0
  - `remaining` = max(0, target - current)
- `monthsUntil(year, quarter, now)` → 남은 개월 수
  - 기간 종료월: quarter 있으면 그 분기 마지막 달(Q1→3, Q2→6, Q3→9, Q4→12), 없으면 12월.
  - `(endYear*12 + endMonth) - (nowYear*12 + nowMonth)`, 최소 1로 clamp.
- `monthlyNeeded(remaining, year, quarter, now)` → `number | null`
  - `year`가 null이거나 `remaining`<=0 → null (기한 없음/달성).
  - 그 외 `ceil(remaining / monthsUntil(...))`.

## 훅 (`src/hooks/useSavingsGoals.ts`)

useFixedCosts 패턴 그대로:
- `useSavingsGoals()` — `active=true`, `created_at` 순.
- `useAddSavingsGoal / useUpdateSavingsGoal / useDeleteSavingsGoal`.
- `useSavingsProgress()` — `transactions`에서 `savings_goal_id`가 있는 행의 `savings_goal_id, amount`만
  조회해 `Map<goalId, sum>` 반환(전체 기간 누적). onSuccess 무효화 대상은 `['transactions']` 변경 시 자동 갱신되도록 같은 쿼리키 사용 안 함 → 별도 쿼리키 `['savings_progress']`, 거래 추가/수정 mutation의 onSuccess에 무효화 추가.

## UI

### SavingsManageScreen (`/household/savings`)
고정비 화면과 같은 톤(뒤로가기 ‹집, 제목, 목록, 하단 추가 버튼).
- 목표 목록: 각 목표마다
  - 이름
  - 진행바(모은 금액 / 목표액) + `%`
  - 남은 금액, 기한이 있으면 "월 약 ₩X씩 · 2027년 3분기까지"
- 목표 탭 → `SavingsGoalSheet`(편집)
- 하단 "저축 목표 추가" 버튼

### SavingsGoalSheet (추가/편집)
FixedCostSheet 패턴. 필드: 이름, 목표액, 기한(연도 select + 분기 select, 둘 다 "없음" 가능), 삭제(편집 시).

### TransactionSheet 변경
- 선택된 카테고리가 `is_savings`이면 카테고리 칩 아래에 **"목표"** select 노출.
- 목표가 하나도 없으면 "먼저 저축 목표를 추가하세요" 안내 + 저장 비활성.
- 저장 payload에 `savings_goal_id` 포함(저축 카테고리 아니면 null).
- 편집 시 `editing.savings_goal_id` 프리로드.
- `useTransactions`의 add/update가 payload를 그대로 넘기므로 `savings_goal_id`만 payload에 추가.

### HomeScreen (집)
"고정비 관리" 버튼 아래에 동일 스타일 "저축 목표" 버튼 → `nav('/household/savings')`.

### 라우팅 (`App.tsx`)
`<Route path="/household/savings" element={<SavingsManageScreen />} />` 추가.

## 테스트

- `src/lib/savings.test.ts`: goalProgress(경계값 0/초과/정확), monthsUntil(분기/연도/과거→1), monthlyNeeded(기한없음→null, 달성→null, 정상 ceil).
- 기존 tsc / build / vitest 통과 유지.

## 파일 요약

신규:
- `supabase/schema-savings.sql`
- `src/lib/savings.ts` + `src/lib/savings.test.ts`
- `src/hooks/useSavingsGoals.ts`
- `src/screens/SavingsManageScreen.tsx`
- `src/components/SavingsGoalSheet.tsx`

수정:
- `src/types.ts` (SavingsGoal, Category.is_savings, Transaction.savings_goal_id)
- `src/components/TransactionSheet.tsx` (목표 select + payload)
- `src/hooks/useTransactions.ts` (add/update onSuccess에 savings_progress 무효화)
- `src/screens/HomeScreen.tsx` (저축 목표 버튼)
- `src/App.tsx` (라우트)

## ⑥ 자산현황 연결 지점 (미래)

`useSavingsProgress` 총합(모든 목표 current 합)이 순자산의 "현금성 저축" 항목으로 그대로 들어간다.
이번 범위에서는 데이터만 마련하고 화면은 만들지 않는다.
