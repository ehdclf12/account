# 아카이빙 — 설계서

작성일: 2026-07-12
참조: Craft "organize"(https://www.craft.do/ko/organize) 중 체크리스트·URL 아카이브·범용 노트 부분을 가계부 규모에 맞게 축소 구현.

## 목적

"우리집" 앱에 **예산관리와 나란히 놓이는 독립 최상위 서비스** "아카이빙"을 추가한다.
예산관리의 하위 기능이 아니라 형제 관계다. 부부(동욱·도영)가 함께 쓰는
메모·할일·링크 정리 공간이다.

핵심 3가지(사용자 확정):
1. 메모(자유 텍스트)
2. 체크리스트(할일 정리)
3. URL 아카이브(제목·썸네일·설명 미리보기 자동 표시)

## 진입 구조 (IA)

- 홈 메뉴(`/`, HomeMenuScreen, 제목 "우리집")에 카드 2개가 **형제**로 나열:
  - `예산관리` → `/budget` (기존)
  - `아카이빙` → `/archive` (신규)  ← 예산관리 카드 바로 아래에 추가
- 새 화면 `/archive` (ArchiveScreen)은 예산관리와 무관한 독립 화면.
- 데이터는 앱 전체 공유(동욱·도영). RLS는 기존 관례대로 `auth_all`(인증 사용자 전체 허용).

## 카드 모델 (한 항목 = 한 카드)

항목 하나는 아래 3종 중 하나(`kind` 판별자):

| kind | 내용 필드 | 카드 표시 |
|------|-----------|-----------|
| `memo` | `title`, `body`(텍스트) | 제목 + 본문 2~3줄 미리보기 |
| `checklist` | `title`, `checklist`(JSONB `[{text,done}]`) | 제목 + `3/5 완료` + 인라인 체크박스(탭 토글) |
| `link` | `title`, `url`, `preview`(JSONB OG 메타) | 썸네일 + 제목 + 사이트명, 탭 시 새 탭으로 원문 열기 |

- 체크리스트 항목과 링크 미리보기는 **JSONB로 카드에 내장**한다(2인 앱, 조인 불필요, 구현·유지보수 단순). 정규화 별도 테이블은 이 규모에 과함(YAGNI).

## 폴더 분류

- 화면 상단 폴더 칩: `전체 · 미분류 · <폴더들…>`.
- 칩 선택 시 해당 폴더 카드만 필터. `전체`=모두, `미분류`=folder_id NULL.
- 폴더 추가/이름변경/삭제(FolderSheet). 폴더 삭제 시 항목은 삭제되지 않고 `미분류`로 이동(`on delete set null`).

## URL 미리보기 (서버리스)

- `api/preview.js` 신규 — 기존 `api/quotes.js`와 **동일 패턴**(Vercel 서버리스 함수, 외부 키 불필요, 파일 내 자기완결·`node --check` 검증).
- `GET /api/preview?url=<encoded>` → 대상 페이지 HTML을 fetch하여 OG 메타(`og:title`, `og:description`, `og:image`, `og:site_name`; 없으면 `<title>` 폴백) 파싱 → `{ title, description, image, site }` JSON 반환. 상대경로 이미지 URL은 절대경로로 보정.
- 링크 카드 **추가/URL 편집 시점에 한 번** 호출해 결과를 DB `preview`(JSONB)에 저장 → 목록 조회 시 재요청 없음.
- 폴백: 미리보기 실패 또는 로컬 dev(=/api 없음) → 사용자가 제목을 수동 입력, 카드엔 URL만 표시. 실 미리보기 검증은 Vercel 배포본에서 수행.

## 데이터 모델 (`supabase/schema-archive.sql`)

```sql
create table if not exists archive_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists archive_items (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references archive_folders(id) on delete set null,
  kind text not null check (kind in ('memo','checklist','link')),
  title text not null default '',
  body text,             -- memo 본문
  url text,              -- link URL
  preview jsonb,         -- link OG {title,description,image,site}
  checklist jsonb,       -- checklist [{text,done}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table archive_folders enable row level security;
alter table archive_items   enable row level security;
drop policy if exists auth_all on archive_folders;
drop policy if exists auth_all on archive_items;
create policy auth_all on archive_folders for all to authenticated using (true) with check (true);
create policy auth_all on archive_items   for all to authenticated using (true) with check (true);
```
- idempotent(`if not exists`), 사용자가 Supabase SQL Editor에서 수동 실행(기존 마이그레이션 관례).
- Realtime 반영을 위해 두 테이블을 `supabase_realtime` publication에 포함(다른 테이블과 동일 처리).

## 코드 구성

- **타입** `src/types.ts`: `ArchiveKind`, `ArchiveFolder`, `ArchiveItem`, `ChecklistEntry`, `LinkPreview` 추가.
- **순수 로직(TDD)** `src/lib/archive.ts` + `archive.test.ts`:
  - `checklistProgress(items) -> { done, total }` (빈 배열 안전)
  - `normalizeUrl(input) -> string | null` (스킴 없으면 `https://` 보정, 유효성)
  - `countByFolder(items) -> Record<folderId|'none', number>` (폴더 칩 카운트용)
- **훅** `src/hooks/useArchive.ts` (useAssets 패턴):
  - `useFolders()`, `useAddFolder/UpdateFolder/DeleteFolder`
  - `useArchiveItems()`, `useAddItem/UpdateItem/DeleteItem`
  - `useToggleCheck(itemId, index)` — checklist JSONB 갱신 + `updated_at` 갱신
  - 링크 추가 시 클라이언트에서 `/api/preview` 호출 후 결과 포함 insert
- **화면** `src/screens/ArchiveScreen.tsx`: 상단 폴더 칩 + 카드 목록 + FAB(추가) + 폴더 관리 진입.
- **시트** `src/components/ArchiveItemSheet.tsx`(카드 추가/편집: kind 선택 → 타입별 필드, 폴더 선택), `src/components/FolderSheet.tsx`(폴더 추가/이름변경/삭제).
- **라우팅** `src/App.tsx`: `<Route path="/archive" ... />` 추가.
- **홈 메뉴** `src/screens/HomeMenuScreen.tsx`: `아카이빙` 카드 추가(예산관리 아래).
- **실시간** `src/hooks/useRealtime.ts`: `archive_folders`·`archive_items` 구독 → 각각 `['folders']`·`['archive_items']` 무효화.

## 스타일

- 기존 토스 스타일(`bg-card rounded-2xl p-5`, `text-ink/text-sub/text-brand`) 준수.
- 이모지 배지 최소화(프로젝트가 이모지 제거 관례) — 카드 종류는 텍스트/레이아웃으로 구분.
- 입력은 기존 시트 관례대로 중앙 모달 패턴.

## 검증

- `lib/archive.ts` 단위 테스트(진행률·URL 정규화·폴더 카운트) 통과.
- `npm run build`(tsc + vite) 통과, 기존 46개 테스트 회귀 없음.
- `api/preview.js`는 `node --check` 통과.
- 실 미리보기·실시간 동기화는 Vercel 배포본 + 두 계정 로그인으로 최종 검증(로컬은 폴백 경로).

## 비범위 (YAGNI)

- 페이지 안에 블록 섞기(Craft 블록 에디터) — 카드 모델로 대체.
- 태그, 컬렉션(DB 뷰), 이메일/웹클리퍼 캡처, 검색 고도화 — 이번 범위 제외.
- 항목별 담당자(who) 구분 — 공유 목록으로 충분.
