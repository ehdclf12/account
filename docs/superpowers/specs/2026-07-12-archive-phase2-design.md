# 아카이빙 고도화(2단계) — 설계서

작성일: 2026-07-12
기반: 1단계 아카이빙(메모·체크리스트·링크 카드 + 폴더 + 실시간). 본 문서는 그 위의 고도화.

## 목적

부부(동욱·도영)의 아카이빙을 실사용에 맞게 고도화한다. 폴더 탐색을 좌측 메뉴로
바꾸고 분류를 필수화하며, 카드에 사진·기한·색상·핀·보관을 더한다.

확정된 범위(사용자 결정):
- 검색: **제외**
- 폴더: **좌측 드로어 메뉴**로 탐색, **서브폴더(2단계)** 지원
- **"전체" 뷰 유지**, **"미분류" 제거** → 분류 필수(모든 카드는 폴더 소속)
- 정렬·고정(핀), 할일 기한(푸시 없음), 색상 라벨, 보관(archive)
- **사진 카드**(앨범 업로드, Supabase Storage 공개 버킷)

## A. 폴더 UX 개편

### 탐색 = 좌측 드로어
- `ArchiveScreen` 상단바: `☰`(드로어 열기) + 현재 뷰 이름(전체 또는 폴더명).
- `FolderDrawer`: 왼쪽에서 슬라이드하는 오버레이. 항목 순서:
  1. **전체** — 모든 폴더의 (보관 안 된) 카드.
  2. **폴더 트리** — 최상위 폴더들, 각 최상위 폴더는 펼침/접힘으로 직속 **서브폴더** 표시(2단계까지).
- 폴더/전체 탭 → 선택 + 드로어 닫힘. 하단에 **"폴더 관리"** 버튼 → `FolderSheet`.

### 분류 규칙
- **"미분류" 없음**: 카드는 반드시 폴더에 속한다. `ArchiveItemSheet`의 폴더 선택은 **필수**(빈 값 옵션 제거).
- **"전체" 뷰 유지**: 특수 뷰. 모든 폴더의 카드를 폴더 무관하게 모아 보여줌(읽기 전용 집계, 폴더 아님).
- 폴더가 하나도 없을 때: 목록 대신 "폴더를 먼저 만들어 주세요" + 생성 버튼. 이 상태에서 카드 추가 시도 시 폴더 생성 유도.

### 뷰별 표시 규칙
- 선택 뷰가 **전체**: `archived=false`인 모든 카드.
- 선택 뷰가 **특정 폴더**: 그 폴더에 **직접** 속한 `archived=false` 카드만(서브폴더 카드는 그 서브폴더 뷰에서 봄).
- **"보관됨" 토글**(상단): 켜면 현재 뷰의 `archived=true` 카드를 대신 보여줌.

### 폴더 관리(`FolderSheet`)
- 최상위 폴더 추가.
- 특정 최상위 폴더 아래 **서브폴더 추가**(서브폴더 밑 서브폴더는 불가 — 2단계 제한).
- 이름 변경.
- 삭제: **비어 있을 때만**(직속 카드 0개 + 직속 서브폴더 0개). 아니면 막고 안내("먼저 항목을 옮기거나 비우세요").

## B. 정렬 · 고정(핀)

- 카드에 **핀**(pinned) 토글. 정렬 결과에서 핀 카드가 항상 먼저.
- 상단 **정렬 드롭다운**: `최근 수정`(기본) / `생성순` / `이름순` / `기한순`.
- 핀 그룹 안에서도 동일 정렬 규칙 적용.

## C. 할일 기한 (푸시 없음)

- 카드에 **기한일**(due_date, 선택) 설정(`ArchiveItemSheet`의 date 입력).
- 카드 배지: `지남`(빨강) / `오늘` / `D-n`(임박). 기한 없으면 배지 없음.
- 정렬 `기한순`: 기한 있는 카드 우선, 임박(가까운 날짜) 우선; 기한 없는 카드는 뒤.
- **실제 푸시 알림 없음**(앱 안 표시만).

## D. 카드 배지 · 보관

- **색상 라벨**: 프리셋(예: 없음/빨강/주황/초록/파랑/보라). 카드 왼쪽 색 스트립으로 표시.
- **보관(archived)**: 카드를 보관하면 기본 목록에서 숨김. 상단 "보관됨" 토글로 열람·해제.
- **폴더 이동**: 별도 UI 없이 `ArchiveItemSheet`의 폴더 선택 변경으로 처리.
- 위 컨트롤(핀·기한·색상·보관·폴더)은 모두 **카드 탭 → 편집 시트**에서 조작(새 화면 없음).

## E. 사진 카드 (앨범 업로드)

- 새 카드 종류 **`image`(사진)**.
- 입력: `<input type="file" accept="image/*">` — 모바일에서 앨범/카메라 선택 가능.
- 저장: **Supabase Storage 공개 버킷 `archive`**. 파일명 `crypto.randomUUID()` + 확장자, 랜덤 경로.
  - 업로드 후 public URL을 카드 `url`에 저장(별도 컬럼 없음). `preview` 미사용.
- 카드 표시: 썸네일 이미지 + 제목(선택). 탭 → 편집 시트(제목/폴더/핀/기한/색상/보관).
- **카드 삭제 시 스토리지 파일도 삭제**(공개 URL에서 경로 유도 후 remove).
- 한 카드 = 사진 1장(여러 장은 범위 밖).

## F. 데이터 모델 (`supabase/schema-archive-2.sql`, idempotent)

기존 테이블에 컬럼 추가 + 스토리지 버킷/정책. 재실행 안전.

```sql
-- 폴더 계층: 서브폴더용 parent_id (null=최상위). 삭제는 앱에서 '비었을 때만' 강제.
alter table archive_folders add column if not exists parent_id uuid references archive_folders(id) on delete restrict;

-- 카드 확장: 핀 / 기한 / 색상 / 보관
alter table archive_items add column if not exists pinned   boolean not null default false;
alter table archive_items add column if not exists due_date date;
alter table archive_items add column if not exists color    text;      -- 프리셋 키(null=없음)
alter table archive_items add column if not exists archived boolean not null default false;

-- kind에 'image' 추가: 기존 check 제약 교체
alter table archive_items drop constraint if exists archive_items_kind_check;
alter table archive_items add constraint archive_items_kind_check
  check (kind in ('memo','checklist','link','image'));

-- 사진 저장 공개 버킷
insert into storage.buckets (id, name, public)
  values ('archive','archive', true)
  on conflict (id) do nothing;

-- 버킷 정책: 공개 읽기 + 인증 사용자 쓰기/삭제
drop policy if exists archive_read   on storage.objects;
drop policy if exists archive_write  on storage.objects;
drop policy if exists archive_delete on storage.objects;
create policy archive_read   on storage.objects for select using (bucket_id = 'archive');
create policy archive_write  on storage.objects for insert to authenticated with check (bucket_id = 'archive');
create policy archive_delete on storage.objects for delete to authenticated using (bucket_id = 'archive');
```

- `folder_id`는 DB에서 nullable 유지(마이그레이션 안전), **앱에서 필수 강제**. 기존 데이터에 null folder_id 카드가 있으면 그대로 두되, "전체" 뷰엔 나타나므로 사용자가 편집으로 폴더 지정 가능(1단계 산출물이 소량이라 무해). 신규 생성 경로는 항상 폴더를 요구하므로 새 null은 생기지 않음.
- 컬럼만 추가되므로 기존 `archive_items`/`archive_folders` 실시간 구독 그대로 동작.

## G. 코드 구성

- **타입** `src/types.ts`:
  - `ArchiveKind`에 `'image'` 추가.
  - `ArchiveItem`에 `pinned: boolean`, `due_date: string | null`, `color: string | null`, `archived: boolean`.
  - `ArchiveFolder`에 `parent_id: string | null`.
  - `ArchiveColor`(프리셋 키 유니온) + `SortMode = 'updated'|'created'|'name'|'due'`.
- **순수 로직(TDD)** `src/lib/archive.ts`:
  - 기존 `checklistProgress`, `normalizeUrl` 유지. **`countByFolder` 및 그 테스트 삭제**(칩/카운트 폐지).
  - `buildFolderTree(folders): FolderNode[]` — parent_id 기준 2단계 트리.
  - `sortItems(items, mode): ArchiveItem[]` — 핀 우선, mode별 2차 정렬(이름은 title 로케일, 기한은 due 오름차순·없으면 뒤).
  - `dueStatus(due: string | null, todayISO: string): { kind: 'overdue'|'today'|'upcoming'; days: number } | null`.
  - `storagePathFromPublicUrl(url: string): string | null` — 공개 URL에서 `archive/` 이후 경로 추출(삭제용).
- **훅** `src/hooks/useArchive.ts`:
  - `useAddFolder`에 `parent_id` 지원(payload 확장). 폴더 삭제는 기존 `useDeleteFolder` 유지(앱이 비어있을 때만 호출).
  - 카드 부분 수정(핀·기한·색상·보관·폴더·제목)은 기존 `useUpdateItem` 재사용.
  - **`uploadArchiveImage(file): Promise<string>`** — Storage 업로드 후 public URL 반환(랜덤 경로).
  - `useDeleteItem` 확장: 대상이 `kind==='image'`면 스토리지 파일도 remove(경로는 `storagePathFromPublicUrl`).
- **컴포넌트**
  - 신규 `src/components/FolderDrawer.tsx` — 좌측 드로어, 전체 + 폴더 트리(펼침/접힘) + 선택 + "폴더 관리".
  - `src/components/FolderSheet.tsx` 확장 — 최상위/서브폴더 추가(parent 선택), 이름변경, 비었을 때만 삭제.
  - `src/components/ArchiveItemSheet.tsx` 확장 — kind에 사진 추가(파일 업로드), 폴더 선택 필수(계층 라벨), 핀·기한(date)·색상 칩·보관 토글.
- **화면** `src/screens/ArchiveScreen.tsx` 재구성 — 상단바(☰·뷰 이름·보관 토글·정렬 드롭다운), 선택 뷰 기준 필터 + `sortItems`, 카드에 핀/색/기한 배지 + 사진 썸네일, FAB. (검색·칩·카운트 제거)
- **실시간** `useRealtime.ts` 변경 없음(테이블 동일, 컬럼만 증가).

## H. 스타일

- 기존 토스 스타일 준수(`bg-card rounded-2xl`, `text-ink/text-sub/text-brand`, 위험 `text-[#F04452]`). 이모지 최소.
- 드로어: `fixed inset-0` 딤 + 왼쪽 패널(`max-w-xs`), 바깥 탭 시 닫힘.
- 색상 라벨 프리셋은 고정 팔레트(접근성 무난한 채도) — 카드 좌측 4px 스트립.

## I. 검증

- `lib/archive.ts` 테스트(트리 빌드·정렬·기한상태·스토리지 경로 추출) 통과.
- `npm run build` + 기존/신규 테스트 통과.
- 사용자: `schema-archive-2.sql` 실행(컬럼/kind/버킷/정책). Storage 버킷 `archive` 생성 확인.
- Vercel 재배포 후 두 계정: 드로어 폴더 탐색·서브폴더·전체 뷰, 사진 업로드(앨범), 핀/정렬/기한/색상/보관, 실시간 동기화 확인.

## J. 비범위 (YAGNI)

- 검색, 3단계 이상 폴더 중첩, 카드 드래그 수동 순서, 실제 푸시 알림, 카드당 다중 사진, 이미지 편집/크롭.
