# 아카이빙 폴더 드래그 순서변경 — 설계서

작성일: 2026-07-12
기반: 아카이빙 고도화(2단계)의 좌측 폴더 드로어(`FolderDrawer`).

## 목적

좌측 폴더 드로어에서 폴더를 **길게 눌러 드래그해 순서를 변경**한다. 순서는 기존
`archive_folders.sort_order`로 저장되어 두 사용자(동욱·도영)에게 실시간 동기화된다.

## 확정 결정(사용자)

- 대상 기기: **폰(터치) + 맥(마우스) 모두** → Pointer Events 사용.
- 범위: **최상위 폴더끼리 + 같은 부모의 서브폴더끼리**. 다른 폴더로 이동(부모 변경)은 안 함.
- 조작: **길게 눌러(≈300ms) 드래그**, 짧게 탭하면 기존대로 폴더 선택. `전체` 행은 고정.

## 동작

- 폴더 이름 행에서 pointerdown → 타이머 시작. 이동이 임계값(≈6px) 미만이고 ≈300ms 지속되면 **드래그 모드** 진입(해당 행 살짝 확대/음영).
- 임계값 이상 즉시 이동하거나 300ms 전에 손을 떼면 → **탭(폴더 선택)**으로 처리.
- 드래그 모드에서 pointermove 시, 포인터 Y와 **같은 그룹** 각 행의 중앙선을 비교해 대상 인덱스를 계산, 작업 중인 순서를 실시간 재배치(시각 반영).
- pointerup → 그 그룹의 새 순서를 확정 저장. pointercancel → 취소.
- 드래그 중에는 `touch-action: none`으로 페이지 스크롤 방지.

### 그룹 정의
- 그룹 A: `parent_id === null`인 최상위 폴더들.
- 그룹 B(각각): 같은 `parent_id`를 가진 서브폴더들.
- 드래그는 시작한 폴더가 속한 그룹 내에서만 재배치(다른 그룹 행은 대상 아님).

## 저장 · 동기화

- 확정 시 해당 그룹의 폴더에 새 순서대로 `sort_order = 0,1,2,…`를 부여, 변경분을 Supabase에 일괄 업데이트.
- 그룹별로 0부터 부여해도 표시 정상: `useFolders`는 전역 `sort_order` 정렬 후 `buildFolderTree`가 그룹별로 filter하므로, 그룹 내 상대 순서만 의미가 있음(그룹 간 값 충돌 무해).
- 기존 실시간 구독(`archive_folders` → `['folders']` 무효화)으로 상대 기기에 반영.
- **DB 마이그레이션·사용자 SQL 불필요**(`sort_order` 컬럼 이미 존재).

## 코드 구성

- **순수 로직(TDD)** `src/lib/archive.ts`:
  - `moveItem<T>(arr: T[], from: number, to: number): T[]` — 원소를 from→to로 옮긴 새 배열(불변). 범위 밖/동일 인덱스는 원본 복사 반환.
- **훅** `src/hooks/useArchive.ts`:
  - `useReorderFolders()` — mutate(`{ id: string; sort_order: number }[]`): 각 항목 `update({sort_order}).eq('id')` 일괄(Promise.all), onSuccess `['folders']` 무효화.
- **컴포넌트** `src/components/FolderDrawer.tsx`:
  - 폴더 행에 Pointer Events 기반 long-press 드래그 부착. 드래그 중 작업 순서를 로컬 state로 시각 반영, pointerup에 `useReorderFolders`로 저장.
  - 탭(짧게)은 기존 `onSelect(key)` 유지. 드래그였으면 select 억제.
  - `전체` 행은 드래그 비대상.

## 검증

- `moveItem` 단위 테스트(중간→앞, 앞→뒤, 동일 인덱스, 범위 밖).
- `npm run build` + 기존 테스트 통과.
- 배포본에서: 폰 길게 눌러 드래그, 맥 마우스 드래그, 서브폴더 그룹 내 정렬, 상대 폰 실시간 반영, 탭 선택이 여전히 정상인지 확인.

## 비범위 (YAGNI)

- 드래그로 부모 변경(폴더를 다른 폴더 안에 넣기), 3단계 이상 중첩, 카드(항목) 드래그 순서변경, 애니메이션 정교화.
