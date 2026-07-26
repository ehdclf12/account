# 시간관리 — 목표 & 명언 설계

2026-07-26

## 목표

Time 화면의 "블럭 선택" 위에, 자신이 진짜 세우고 싶은 **목표**(시간 채우기가 아니라
대목표/서브목표)와 매일 볼 **나만의 명언**을 두어 동기를 유지한다.

- **체크 가능한 목표** — 서브목표를 하나씩 체크하며 진행한다.
- **대목표 여러 개, 각각 서브목표** — 2단계 구조.
- **고정 명언 1개** — 목표 영역 맨 위에 항상 표시.
- **기록은 개인별**이다. 블럭과 동일하게 `who`로 분리하며, 서로의 목표는 다루지 않는다.

## 범위

목표 CRUD + 서브목표 체크 + 명언 1개. 목표에 마감일·알림·통계는 넣지 않는다(YAGNI).
목표와 시간 블럭/누적 시간의 연동은 하지 않는다 — 목표는 독립된 체크리스트다.

## 데이터

아카이브 체크리스트 카드와 **같은 패턴**을 쓴다. 서브목표를 별도 테이블로 정규화하지 않고
대목표 한 행의 `checklist` JSONB 배열로 담는다. 서브목표 추가/체크/삭제/이름수정은
모두 그 행 하나를 갱신한다.

```sql
time_goals
  id, who, title(1~40자), checklist(jsonb, ChecklistEntry[]), sort_order, created_at

time_quotes
  who (pk), text, updated_at
```

- `checklist`는 기존 `ChecklistEntry { text: string; done: boolean }[]` 타입을 재사용한다.
- 진행률은 파생값이다 — `checklist`에서 `done` 개수 / 전체 개수. 별도 컬럼을 두지 않는다.
- `time_quotes`는 사람당 한 행(`who` PK)이다. 명언이 없으면 행이 없거나 빈 문자열이다.
- 스키마 파일 `supabase/schema-time-goals.sql`. 기존 파일들과 같은 관례:
  RLS `household_only`(`public.is_household_member()`), realtime publication 추가,
  재실행해도 안전(idempotent). **사용자가 SQL Editor에서 수동 실행**한다.

## 타입

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

`ChecklistEntry`는 새로 만들지 않고 `src/types.ts`의 기존 것을 쓴다.

## 훅 (`src/hooks/useTimeGoals.ts`)

`useTimeBlocks.ts`와 같은 결(TanStack Query + `who` 스코프 + realtime 무효화).

- `useTimeGoals()` — `who`의 목표를 `sort_order, created_at` 순으로.
- `useAddGoal()` — `{ title, sort_order }` 로 대목표 추가(checklist 빈 배열).
- `useUpdateGoal()` — `{ id, title?, checklist?, sort_order? }`. **서브목표 추가·체크·삭제·
  이름수정은 전부 여기로** `checklist` 통째 저장(아카이브 체크리스트와 동일).
- `useDeleteGoal()` — 대목표 삭제.
- `useQuote()` — `who`의 명언 한 행.
- `useSetQuote()` — 명언 upsert(`who` 충돌 시 갱신).

## 화면 배치

"블럭 선택" 카드 **위**에 새 카드(`bg-card rounded-2xl p-4`). 위에서 아래로:

```
┌─ 목표 카드 ─────────────────────┐
│  "천 리 길도 한 걸음부터"    ✎  │  ← 명언 (italic, 편집 모드에서 연필)
│ ─────────────────────────────── │
│  ▸ 사업 매출 1억          2/5   │  ← 대목표(접힘) 제목 + 진행바
│  ▾ 독서 습관 만들기       3/4   │  ← 펼침
│      ☑ 매일 30분 읽기            │
│      ☑ 서평 쓰기                 │
│      ☐ 월 4권                    │
│      + 서브목표 추가  (편집 시)  │
│  [ 편집 ]              [ + ]     │  ← 헤더 우측, 블럭 선택과 동일 패턴
└─────────────────────────────────┘
```

- 대목표 한 줄: 좌측 제목, 우측 `2/5` + 얇은 진행바. 탭 = 접기/펼치기(로컬 상태).
- **기본 접힘.** 펼치면 서브목표가 체크박스 행으로 나온다.
- 서브목표가 없는 대목표는 진행률 대신 비워두거나 `0/0` 없이 담백하게 제목만.

## 상호작용

블럭 선택의 `편집` 토글과 **같은 스타일**의 자체 편집 버튼을 목표 카드 헤더에 둔다.

**평소 모드**
- 대목표 탭 → 접기/펼치기.
- 서브목표 탭 → `done` 토글(체크).
- 그 외 편집 불가(오탭으로 지워지지 않게).

**편집 모드**
- 헤더 `+` → 대목표 추가 시트(`TimeGoalSheet`, 제목 입력). 블럭 시트와 같은 결.
- 대목표마다 삭제(×)·수정(✎) 배지. 수정은 시트로 제목 변경.
- 펼친 상태에서 서브목표: `+ 서브목표 추가`(인라인 입력), 각 항목 삭제·이름수정.
- 명언 우측 연필 → 인라인 입력으로 수정(작은 입력창 + 저장). 시트까지는 과함.

삭제는 아카이브·블럭과 마찬가지로 `confirm()`으로 확인한다.

## 컴포넌트

목표 로직은 **별도 컴포넌트/훅으로 분리**해 `TimeScreen`이 더 커지지 않게 한다.

- `src/components/TimeGoals.tsx` — 목표 카드 전체(명언 + 대목표 리스트 + 편집 모드).
- `src/components/TimeGoalSheet.tsx` — 대목표 추가/수정 시트(제목).
- `src/hooks/useTimeGoals.ts` — 위 훅들.
- `TimeScreen.tsx`는 블럭 카드 위에 `<TimeGoals />` 한 줄 삽입만.

## Realtime

기존 `useRealtime`가 테이블 변경을 구독한다. `time_goals`·`time_quotes`를
publication에 추가하고, 무효화 대상 쿼리키(`['time_goals', who]`, `['time_quote', who]`)를
기존 매핑과 같은 방식으로 연결한다.

## 테스트

진행률 계산(파생값)만 순수 함수로 뽑아 `time.ts`류에 두고 단위 테스트한다
(`done`/전체 비율, 빈 checklist=진행률 없음). UI 상호작용은 수동 확인.
