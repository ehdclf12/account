# 캘린더 화면 설계

작성일: 2026-07-14

## 목표

체크리스트의 기한을 월 캘린더로 본다. 캘린더는 아카이빙의 체크리스트 카드를 비추는 뷰이며,
별도의 이벤트 저장소를 두지 않는다. 캘린더에서 만든 할 일은 곧 아카이빙의 체크리스트 카드다.

## 범위

포함:

- `Calendar` 메뉴 신설 (홈 메뉴 최상단, 영문 라벨)
- 월 그리드 + 날짜별 체크리스트 제목 노출
- 날짜 선택 → 하단에 그날의 체크리스트 목록 → 펼쳐서 체크 → 수정 시트
- 아카이빙에서 `메모` 종류 제거 (기존 메모 카드는 삭제)
- 기한을 체크리스트 전용 필수값으로 전환

제외:

- 앱 전체 다크모드. 별도 스펙으로 뒤이어 진행한다. 캘린더는 색을 테마 토큰
  (`brand` / `ink` / `sub` / `card`)으로만 쓰고 하드코딩 hex를 새로 늘리지 않는다.
- 캘린더 전용 이벤트 테이블, 반복 일정, 알림, 검색.

## 데이터 모델

`archive_items`를 그대로 쓴다. 캘린더에 뜨는 조건:

```
kind === 'checklist' && archived === false && due_date != null
```

`kind`에서 `memo`가 빠져 `checklist | link | image` 셋만 남는다.
`due_date`는 체크리스트에만 존재한다 (링크·사진은 항상 `null`).

### 마이그레이션 — `supabase/schema-calendar.sql`

재실행해도 안전해야 한다. 순서가 중요하다: 기한을 먼저 정리해야 제약이 기존 데이터와 부딪히지 않는다.

```sql
-- 1. 메모 카드 전량 삭제
delete from archive_items where kind = 'memo';

-- 2. kind에서 'memo' 제거
alter table archive_items drop constraint if exists archive_items_kind_check;
alter table archive_items add constraint archive_items_kind_check
  check (kind in ('checklist','link','image'));

-- 3. 체크리스트가 아닌 카드의 기한 제거
update archive_items set due_date = null where kind <> 'checklist';

-- 4. 체크리스트는 기한 필수 (기존 데이터는 검증하지 않음)
alter table archive_items drop constraint if exists archive_items_due_required;
alter table archive_items add constraint archive_items_due_required
  check (kind <> 'checklist' or due_date is not null) not valid;
```

4번이 `not valid`인 이유: 기한 없는 체크리스트가 이미 있어도 마이그레이션이 실패하지 않고,
앞으로 들어오는 데이터만 막는다. 기존 카드는 앱에서 열어 저장할 때 기한을 채우게 된다.

마이그레이션은 사용자가 Supabase SQL Editor에서 직접 실행한다.

## 컴포넌트

### `src/lib/calendar.ts` (신규, 순수 함수)

| 함수 | 하는 일 |
|---|---|
| `monthGrid(year, month)` | 42칸(6주 × 7일) 배열. 각 칸 `{ iso, day, inMonth }`. 월요일 시작, 앞뒤 달로 채움 |
| `shiftMonth(year, month, delta)` | 연도 넘김 처리한 월 이동 |
| `calendarItems(items)` | 위 조건으로 필터 |
| `groupByDue(items)` | `Record<iso, ArchiveItem[]>` |
| `checklistProgress(item)` | `{ done, total, allDone }`. **빈 체크리스트는 `allDone: false`** |

의존성 없이 날짜 계산만 한다. 테스트는 여기에만 붙인다.

### `src/screens/CalendarScreen.tsx` (신규)

상태는 둘뿐이다: `cursor`(보고 있는 연·월), `selected`(선택 날짜 ISO, 기본 오늘).
데이터는 기존 `useArchiveItems()`를 그대로 쓴다 — 같은 react-query 키라서
아카이브에서 수정하면 캘린더가 자동 갱신된다. 동기화 코드가 따로 없다.

레이아웃:

```
7                              ⟳ TODAY
월  화  수  목  금  토  일
29  30   1   2   3   4   5        ← 앞뒤 달은 text-sub
         ▍장보기
13 [14] 15  16  17  18  19        ← 14 = 오늘
20  21  22 [23] 24  25  26        ← 23 = 선택
─────────────────────────────
2026년 7월 12일 (일)
▍장보기 목록                 ← 누르면 그 자리에서 펼쳐짐
  ┌───────────────────────┐
  │ 장보기 목록      2/5   │
  │ ☑ 우유               │
  │ ☐ 계란               │
  │              [수정]   │
  └───────────────────────┘
[ + 새로운 이벤트 ]
```

날짜 칸:

- 최대 3줄. 넘치면 마지막 줄에 `+2`.
- 각 줄 = 카드 색 막대(색 없으면 회색) + 제목(truncate).
- 전부 완료된 카드는 취소선.
- 오늘 이전인데 미완료면 제목이 빨강(`#F04452` — 기존 D-뱃지와 같은 색).

오늘 / 선택 표시 (스크린샷의 "은은한 오늘 / 확실한 선택" 대비를 밝은 테마로 옮긴 것):

- 오늘: `bg-card` (연회색) 블록
- 선택: `bg-brand/10` + `ring-1 ring-brand`

월 이동: 좌우 스와이프 + `TODAY` 버튼. 가로 이동량이 세로보다 클 때만 월 이동으로 처리해
세로 스크롤과 충돌하지 않게 한다 (기존 `FolderDrawer`의 포인터 처리 방식을 따른다).

폭: `App.tsx`가 모든 화면을 `max-w-md`로 묶는데, 7열 그리드가 375px에 들어가면 한 칸이 50px라
제목이 두세 글자밖에 안 보인다. 캘린더 라우트만 `max-w-2xl`로 넓힌다.

### `src/components/ChecklistCard.tsx` (신규, 추출)

아카이브 화면이 지금 인라인으로 그리고 있는 체크리스트 카드(체크박스 + `2/2` 진행)를
컴포넌트로 빼서 아카이브와 캘린더가 공유한다. 체크 토글은 기존 `useToggleCheck` 훅.
`수정` 버튼은 `onEdit` 콜백으로 위임한다.

### 기존 파일 변경

`src/types.ts`

- `ArchiveKind`에서 `'memo'` 제거

`src/components/ArchiveItemSheet.tsx`

- `KIND_OPTIONS`에서 메모 제거, 그리드 `grid-cols-4` → `grid-cols-3`
- 메모용 `body` 텍스트영역 분기와 `kind === 'memo'` 저장 경로 삭제
- 기본 `kind`를 `'checklist'`로
- **기한 입력칸을 `kind === 'checklist'`일 때만 렌더**
- 저장 시 체크리스트인데 기한이 비면 `alert('기한을 선택해 주세요.')` 후 중단
- 프롭 추가: `defaultDueDate?: string` — 캘린더가 선택 날짜를 미리 채워 시트를 연다.
  캘린더와 시트를 잇는 유일한 접점이다.

`src/screens/ArchiveScreen.tsx`

- 메모 카드 렌더 분기 제거
- 체크리스트 카드 렌더링을 `ChecklistCard`로 교체
- `DueBadge`는 그대로 (링크·사진은 `due_date`가 `null`이라 자동으로 안 뜬다)
- "기한순" 정렬 그대로 유지 — 이제 체크리스트만 기한이 있으니 자연히 체크리스트가 앞에 온다

`src/screens/HomeMenuScreen.tsx`

- 맨 위에 `Calendar` 버튼 추가 → `/calendar`

`src/App.tsx`

- `/calendar` 라우트 추가
- 캘린더 라우트만 `max-w-2xl` 적용

## 데이터 흐름

```
useArchiveItems()  ──┬──> ArchiveScreen  (폴더별 카드 목록)
  (react-query)      │
  queryKey:          └──> CalendarScreen (기한별 월 그리드)
  ['archive_items']            │
                               ├─ 날짜 클릭 → selected 갱신
                               ├─ 항목 펼침 → ChecklistCard → useToggleCheck
                               ├─ [수정]    → ArchiveItemSheet(editing=item)
                               └─ [+ 새 이벤트] → ArchiveItemSheet(defaultDueDate=selected)

ArchiveItemSheet 저장 → useAddItem / useUpdateItem
                      → invalidateQueries(['archive_items'])
                      → 두 화면 동시 갱신
```

## 테스트 — `src/lib/calendar.test.ts`

기존 프로젝트 패턴대로 `src/lib/` 순수 함수에만 테스트를 붙인다. 화면은 테스트하지 않는다.

- `monthGrid` — 42칸이 나오는지, 월요일 시작이 맞는지, 앞뒤 달 채움(`inMonth: false`)이 맞는지.
  경계: **1일이 월요일인 달**(앞이 안 채워짐), **말일이 일요일인 달**(뒤가 안 채워짐).
- `shiftMonth` — 12월 → 1월 연도 넘김, 1월 → 12월 역방향.
- `calendarItems` — 링크·사진·보관함(`archived`)·기한없음이 걸러지는지.
- `groupByDue` — 같은 날짜 여러 건이 한 배열에 묶이는지.
- `checklistProgress` — 빈 체크리스트가 `0/0`, `allDone: false`인지.
  (`true`면 항목 없는 카드가 전부 취소선으로 그어진다.)

## 예외 처리

| 상황 | 처리 |
|---|---|
| 기한 없는 기존 체크리스트 | 캘린더에 안 뜬다. 아카이브에서 열어 저장하려면 기한을 요구한다. |
| 폴더가 하나도 없음 | 시트가 `alert('폴더를 선택해 주세요.')`로 저장을 막는다. 기존 동작 유지. |
| 월 스와이프 ↔ 세로 스크롤 | 가로 이동량 > 세로 이동량일 때만 월 이동. |
| 항목 로딩 중 | 그리드는 그리고 항목 줄만 비운다. 캘린더가 늦게 뜨는 것보다 낫다. |

## 건드리지 않는 것

Supabase 훅, react-query 키, realtime, 라우팅 구조. 캘린더는 기존 데이터 계층 위에 얹히는
화면 하나다.
