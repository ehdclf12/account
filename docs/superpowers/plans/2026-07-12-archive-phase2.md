# 아카이빙 고도화(2단계) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 아카이빙에 좌측 드로어 폴더 탐색(서브폴더 2단계·분류 필수·전체 유지·미분류 제거), 핀/정렬/기한/색상/보관, 앨범 사진 업로드를 추가한다.

**Architecture:** 기존 `archive_folders`/`archive_items`에 컬럼 추가(폴더 `parent_id`; 카드 `pinned/due_date/color/archived`; kind에 `image`) + Supabase Storage 공개 버킷 `archive`. 폴더 탐색은 좌측 드로어, 카드 편집은 기존 시트 확장으로 처리. 정렬·트리·기한 로직은 `lib/archive.ts` 순수 함수로 TDD.

**Tech Stack:** React 19, react-router 7, @tanstack/react-query 5, @supabase/supabase-js 2(Storage 포함), Tailwind(토스 스타일), Vitest.

## Global Constraints

- 신규 npm 의존성 추가 금지.
- 토스 스타일: `bg-card rounded-2xl`, `text-ink`/`text-sub`/`text-brand`/`bg-brand`, 위험 `text-[#F04452]`. 이모지 최소.
- import 별칭 `@/`.
- RLS/스토리지 정책은 기존 관례(`auth_all` 수준: 인증 사용자 전체 허용, 공개 읽기).
- Supabase SQL은 사용자가 SQL Editor에서 수동 실행. idempotent(`if not exists`/`on conflict`/`drop policy if exists`).
- **분류 필수**: 카드는 폴더 소속 필수(미분류 없음). **"전체" 뷰는 유지**(모든 폴더 카드 집계).
- 서브폴더는 **2단계까지**(최상위 → 서브폴더). 폴더 삭제는 **비어 있을 때만**.
- 사진 저장은 공개 버킷 `archive`, 랜덤 UUID 경로. 카드 삭제 시 스토리지 파일도 삭제.

---

### Task 1: Supabase 마이그레이션(컬럼·kind·스토리지)

**Files:**
- Create: `supabase/schema-archive-2.sql`

**Interfaces:**
- Consumes: 없음
- Produces: `archive_folders.parent_id`; `archive_items.pinned/due_date/color/archived`; kind check에 `image`; Storage 버킷 `archive` + 정책

- [ ] **Step 1: 파일 작성**

`supabase/schema-archive-2.sql`:

```sql
-- 아카이빙 고도화(2단계): 폴더 계층 + 카드 확장 + 사진 스토리지.
-- 1단계(schema-archive.sql) 실행 후 SQL Editor에서 실행. 재실행해도 안전(idempotent).

-- 폴더 계층: 서브폴더용 parent_id (null=최상위). 삭제는 앱에서 '비었을 때만' 강제.
alter table archive_folders add column if not exists parent_id uuid references archive_folders(id) on delete restrict;

-- 카드 확장: 핀 / 기한 / 색상 / 보관
alter table archive_items add column if not exists pinned   boolean not null default false;
alter table archive_items add column if not exists due_date date;
alter table archive_items add column if not exists color    text;
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

- [ ] **Step 2: 커밋**

```bash
git add supabase/schema-archive-2.sql
git commit -m "feat: 아카이빙 2단계 마이그레이션(폴더 parent_id·카드 확장·image·스토리지)"
```

> 사용자가 SQL Editor에서 실행해야 실제 반영. `archive_items_kind_check` 제약명은 1단계에서 `check (kind in (...))`로 생성되며 Postgres 기본 명명이 `archive_items_kind_check`임. 만약 실제 제약명이 다르면 drop 줄은 무시되고 add에서 중복 에러가 날 수 있으니, 그 경우 사용자에게 실제 제약명 확인을 안내(문서화).

---

### Task 2: 타입 + 순수 로직 확장

**Files:**
- Modify: `src/types.ts`
- Modify (전체 교체): `src/lib/archive.ts`
- Modify (전체 교체): `src/lib/archive.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - 타입: `ArchiveKind`(+`'image'`), `ArchiveColor`, `SortMode`; `ArchiveFolder.parent_id`; `ArchiveItem`에 `pinned/due_date/color/archived`
  - `FolderNode`(= ArchiveFolder + `children: ArchiveFolder[]`)
  - `buildFolderTree(folders: ArchiveFolder[]): FolderNode[]`
  - `sortItems(items: ArchiveItem[], mode: SortMode): ArchiveItem[]` (핀 우선)
  - `dueStatus(due: string | null, todayISO: string): { kind: 'overdue'|'today'|'upcoming'; days: number } | null`
  - `storagePathFromPublicUrl(url: string): string | null`
  - `ARCHIVE_COLORS: { key: ArchiveColor; hex: string }[]`
  - 유지: `checklistProgress`, `normalizeUrl`, `countByFolder`(기존 소비처 `ArchiveScreen`가 Task 7에서 교체될 때까지 유지 — **Task 7에서 제거**)

- [ ] **Step 1: 타입 수정**

`src/types.ts`에서 아카이빙 타입 블록을 아래로 교체(기존 `ArchiveKind`~`ArchiveItem` 정의 대체, 나머지는 유지):

```ts
export type ArchiveKind = 'memo' | 'checklist' | 'link' | 'image'
export type ArchiveColor = 'red' | 'orange' | 'green' | 'blue' | 'purple'
export type SortMode = 'updated' | 'created' | 'name' | 'due'

export interface ChecklistEntry {
  text: string
  done: boolean
}

export interface LinkPreview {
  title: string
  description: string
  image: string
  site: string
}

export interface ArchiveFolder {
  id: string
  name: string
  sort_order: number
  parent_id: string | null
  created_at: string
}

export interface ArchiveItem {
  id: string
  folder_id: string | null
  kind: ArchiveKind
  title: string
  body: string | null
  url: string | null
  preview: LinkPreview | null
  checklist: ChecklistEntry[] | null
  pinned: boolean
  due_date: string | null   // YYYY-MM-DD
  color: ArchiveColor | null
  archived: boolean
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`src/lib/archive.test.ts` 전체를 교체:

```ts
import { describe, it, expect } from 'vitest'
import {
  checklistProgress, normalizeUrl, countByFolder,
  buildFolderTree, sortItems, dueStatus, storagePathFromPublicUrl,
} from './archive'
import type { ArchiveFolder, ArchiveItem } from '@/types'

const folder = (over: Partial<ArchiveFolder>): ArchiveFolder =>
  ({ id: '', name: '', sort_order: 0, parent_id: null, created_at: '', ...over })
const item = (over: Partial<ArchiveItem>): ArchiveItem =>
  ({ id: '', folder_id: null, kind: 'memo', title: '', body: null, url: null,
     preview: null, checklist: null, pinned: false, due_date: null, color: null,
     archived: false, created_at: '', updated_at: '', ...over })

describe('checklistProgress', () => {
  it('완료/전체 개수를 센다', () => {
    expect(checklistProgress([{ text: 'a', done: true }, { text: 'b', done: false }])).toEqual({ done: 1, total: 2 })
  })
  it('null은 0/0', () => {
    expect(checklistProgress(null)).toEqual({ done: 0, total: 0 })
  })
})

describe('normalizeUrl', () => {
  it('스킴 없으면 https:// 를 붙인다', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com/')
  })
  it('공백/도트 없는 호스트는 null', () => {
    expect(normalizeUrl('   ')).toBeNull()
    expect(normalizeUrl('notaurl')).toBeNull()
  })
})

describe('countByFolder', () => {
  it('folder_id로 묶고 null은 none', () => {
    const its = [item({ folder_id: 'f1' }), item({ folder_id: 'f1' }), item({ folder_id: null })]
    expect(countByFolder(its)).toEqual({ f1: 2, none: 1 })
  })
})

describe('buildFolderTree', () => {
  it('parent_id 기준 2단계 트리를 만든다', () => {
    const fs = [
      folder({ id: 'a', name: 'A' }),
      folder({ id: 'b', name: 'B' }),
      folder({ id: 'a1', name: 'A1', parent_id: 'a' }),
    ]
    const tree = buildFolderTree(fs)
    expect(tree.map((t) => t.id)).toEqual(['a', 'b'])
    expect(tree[0].children.map((c) => c.id)).toEqual(['a1'])
    expect(tree[1].children).toEqual([])
  })
})

describe('sortItems', () => {
  it('핀이 항상 먼저', () => {
    const a = item({ id: 'a', pinned: false, updated_at: '2026-01-02' })
    const b = item({ id: 'b', pinned: true, updated_at: '2026-01-01' })
    expect(sortItems([a, b], 'updated').map((x) => x.id)).toEqual(['b', 'a'])
  })
  it('updated는 최신순', () => {
    const a = item({ id: 'a', updated_at: '2026-01-01' })
    const b = item({ id: 'b', updated_at: '2026-01-03' })
    expect(sortItems([a, b], 'updated').map((x) => x.id)).toEqual(['b', 'a'])
  })
  it('name은 이름순', () => {
    const a = item({ id: 'a', title: '나' })
    const b = item({ id: 'b', title: '가' })
    expect(sortItems([a, b], 'name').map((x) => x.id)).toEqual(['b', 'a'])
  })
  it('due는 기한 있는 것 우선·임박순', () => {
    const a = item({ id: 'a', due_date: null, updated_at: '2026-01-05' })
    const b = item({ id: 'b', due_date: '2026-02-01' })
    const c = item({ id: 'c', due_date: '2026-01-10' })
    expect(sortItems([a, b, c], 'due').map((x) => x.id)).toEqual(['c', 'b', 'a'])
  })
})

describe('dueStatus', () => {
  it('과거는 overdue(음수 days)', () => {
    expect(dueStatus('2026-01-01', '2026-01-05')).toEqual({ kind: 'overdue', days: -4 })
  })
  it('같은 날은 today', () => {
    expect(dueStatus('2026-01-05', '2026-01-05')).toEqual({ kind: 'today', days: 0 })
  })
  it('미래는 upcoming(양수 days)', () => {
    expect(dueStatus('2026-01-08', '2026-01-05')).toEqual({ kind: 'upcoming', days: 3 })
  })
  it('null은 null', () => {
    expect(dueStatus(null, '2026-01-05')).toBeNull()
  })
})

describe('storagePathFromPublicUrl', () => {
  it('공개 URL에서 archive 이후 경로를 뽑는다', () => {
    expect(storagePathFromPublicUrl('https://x.supabase.co/storage/v1/object/public/archive/abc.jpg')).toBe('abc.jpg')
  })
  it('해당 마커 없으면 null', () => {
    expect(storagePathFromPublicUrl('https://x/other/abc.jpg')).toBeNull()
  })
})
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run src/lib/archive.test.ts`
Expected: FAIL — `buildFolderTree`/`sortItems`/`dueStatus`/`storagePathFromPublicUrl` 미정의(import 에러).

- [ ] **Step 4: 구현 — `src/lib/archive.ts` 전체 교체**

```ts
import type { ArchiveColor, ArchiveFolder, ArchiveItem, ChecklistEntry, SortMode } from '@/types'

export function checklistProgress(
  items: ChecklistEntry[] | null | undefined,
): { done: number; total: number } {
  const list = items ?? []
  return { done: list.filter((i) => i.done).length, total: list.length }
}

export function normalizeUrl(input: string): string | null {
  const t = input.trim()
  if (!t) return null
  const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`
  try {
    const u = new URL(withScheme)
    if (!u.hostname.includes('.')) return null
    return u.toString()
  } catch {
    return null
  }
}

// Task 7에서 ArchiveScreen 교체와 함께 제거 예정(현재 소비처 유지용).
export function countByFolder(items: ArchiveItem[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const it of items) {
    const key = it.folder_id ?? 'none'
    out[key] = (out[key] ?? 0) + 1
  }
  return out
}

export interface FolderNode extends ArchiveFolder {
  children: ArchiveFolder[]
}

export function buildFolderTree(folders: ArchiveFolder[]): FolderNode[] {
  const tops = folders.filter((f) => !f.parent_id)
  return tops.map((t) => ({
    ...t,
    children: folders.filter((f) => f.parent_id === t.id),
  }))
}

export function sortItems(items: ArchiveItem[], mode: SortMode): ArchiveItem[] {
  const cmp = (a: ArchiveItem, b: ArchiveItem): number => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    switch (mode) {
      case 'name':
        return a.title.localeCompare(b.title)
      case 'created':
        return b.created_at.localeCompare(a.created_at)
      case 'due':
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
        if (a.due_date) return -1
        if (b.due_date) return 1
        return b.updated_at.localeCompare(a.updated_at)
      case 'updated':
      default:
        return b.updated_at.localeCompare(a.updated_at)
    }
  }
  return [...items].sort(cmp)
}

export function dueStatus(
  due: string | null,
  todayISO: string,
): { kind: 'overdue' | 'today' | 'upcoming'; days: number } | null {
  if (!due) return null
  const d = new Date(due + 'T00:00:00')
  const t = new Date(todayISO + 'T00:00:00')
  const days = Math.round((d.getTime() - t.getTime()) / 86400000)
  if (days < 0) return { kind: 'overdue', days }
  if (days === 0) return { kind: 'today', days: 0 }
  return { kind: 'upcoming', days }
}

export function storagePathFromPublicUrl(url: string): string | null {
  const marker = '/storage/v1/object/public/archive/'
  const i = url.indexOf(marker)
  if (i === -1) return null
  return url.slice(i + marker.length) || null
}

export const ARCHIVE_COLORS: { key: ArchiveColor; hex: string }[] = [
  { key: 'red', hex: '#F04452' },
  { key: 'orange', hex: '#FF9500' },
  { key: 'green', hex: '#22C55E' },
  { key: 'blue', hex: '#3182F6' },
  { key: 'purple', hex: '#8B5CF6' },
]
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run src/lib/archive.test.ts`
Expected: PASS (모든 describe 통과).

- [ ] **Step 6: 커밋**

```bash
git add src/types.ts src/lib/archive.ts src/lib/archive.test.ts
git commit -m "feat: 아카이빙 2단계 타입·순수로직(트리·정렬·기한·스토리지경로) TDD"
```

---

### Task 3: 훅 확장(폴더 parent·사진 업로드·이미지 삭제)

**Files:**
- Modify: `src/hooks/useArchive.ts`

**Interfaces:**
- Consumes: Task 2 타입 + `storagePathFromPublicUrl`
- Produces:
  - `useAddFolder()` payload 변경 → `{ name: string; sort_order: number; parent_id: string | null }`
  - `uploadArchiveImage(file: File): Promise<string>` (public URL 반환)
  - `useDeleteItem()` 시그니처 변경 → mutate(`Pick<ArchiveItem,'id'|'kind'|'url'>`), 이미지면 스토리지 파일도 삭제
  - 기존 나머지(useFolders/useArchiveItems/useUpdateFolder/useDeleteFolder/useAddItem/useUpdateItem/useToggleCheck/fetchLinkPreview) 유지

- [ ] **Step 1: import에 storagePathFromPublicUrl 추가**

`src/hooks/useArchive.ts` 최상단 import 수정:

```ts
import type { ArchiveFolder, ArchiveItem, LinkPreview } from '@/types'
import { storagePathFromPublicUrl } from '@/lib/archive'
```

(기존 `import { useQuery, useMutation, useQueryClient } ...`, `import { supabase } ...`는 유지)

- [ ] **Step 2: useAddFolder payload에 parent_id 추가**

`useAddFolder`의 mutationFn 파라미터 타입을 교체:

```ts
export function useAddFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (f: { name: string; sort_order: number; parent_id: string | null }) => {
      const { error } = await supabase.from('archive_folders').insert(f)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }),
  })
}
```

- [ ] **Step 3: useDeleteItem을 이미지 인지 삭제로 교체**

기존 `useDeleteItem` 전체 교체:

```ts
export function useDeleteItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: Pick<ArchiveItem, 'id' | 'kind' | 'url'>) => {
      const { error } = await supabase.from('archive_items').delete().eq('id', item.id)
      if (error) throw error
      if (item.kind === 'image' && item.url) {
        const path = storagePathFromPublicUrl(item.url)
        if (path) await supabase.storage.from('archive').remove([path])
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['archive_items'] }),
  })
}
```

- [ ] **Step 4: uploadArchiveImage 추가**

`fetchLinkPreview` 함수 바로 위(또는 아래)에 추가:

```ts
export async function uploadArchiveImage(file: File): Promise<string> {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('archive').upload(path, file, { upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('archive').getPublicUrl(path)
  return data.publicUrl
}
```

- [ ] **Step 5: 기존 ArchiveItemSheet 임시 호환 패치**

Task 2에서 `ArchiveItem`에 필수 필드(`pinned/due_date/color/archived`)가 추가되었고, Task 3에서 `useDeleteItem` 시그니처가 바뀌었다. 이 때문에 **아직 옛 버전인** `src/components/ArchiveItemSheet.tsx`가 컴파일되지 않는다(Task 6에서 전체 재작성으로 대체됨). Task 3 빌드를 통과시키기 위해 아래 최소 패치만 적용:

(a) `save()` 안의 **세 개 payload 객체**(link / checklist / memo·else 분기) 각각에 4개 필드를 추가. 예를 들어 link 분기:
```ts
      const payload = {
        folder_id: folderId, kind, title: title.trim() || preview?.title || norm,
        body: null, url: norm, preview, checklist: null,
        pinned: false, due_date: null, color: null, archived: false,
      }
```
같은 방식으로 checklist 분기 payload, memo·else 분기 payload 에도 `pinned: false, due_date: null, color: null, archived: false,` 를 추가.

(b) `remove()` 내부의 삭제 호출을 객체로 변경:
```ts
if (editing && confirm('이 항목을 삭제할까요?')) { await del.mutateAsync({ id: editing.id, kind: editing.kind, url: editing.url }); onClose() }
```

(c) `useAddFolder`가 이제 `parent_id`를 요구하므로, **아직 옛 버전인** `src/components/FolderSheet.tsx`의 `create()` 호출도 임시 패치(Task 4에서 전체 재작성으로 대체됨):
```ts
    await add.mutateAsync({ name: n, sort_order: folders.length, parent_id: null })
```

Run: `npm run build`
Expected: 성공(옛 시트/컴포넌트가 새 타입/시그니처로 컴파일됨).

- [ ] **Step 6: 커밋**

```bash
git add src/hooks/useArchive.ts src/components/ArchiveItemSheet.tsx src/components/FolderSheet.tsx
git commit -m "feat: useArchive 폴더 parent_id·사진 업로드·이미지 카드 삭제 시 스토리지 정리 (+옛 시트 임시 호환 패치)"
```

---

### Task 4: 폴더 관리 시트(서브폴더·비었을 때만 삭제)

**Files:**
- Modify (전체 교체): `src/components/FolderSheet.tsx`

**Interfaces:**
- Consumes: Task 2 `buildFolderTree`, Task 3 `useAddFolder`(parent_id)
- Produces: `<FolderSheet open onClose />` (default export, props 동일). 최상위/서브폴더 추가, 이름변경, 비었을 때만 삭제

- [ ] **Step 1: FolderSheet 전체 교체**

`src/components/FolderSheet.tsx`:

```tsx
import { useState } from 'react'
import { useFolders, useArchiveItems, useAddFolder, useUpdateFolder, useDeleteFolder } from '@/hooks/useArchive'
import { buildFolderTree } from '@/lib/archive'

export default function FolderSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: folders = [] } = useFolders()
  const { data: items = [] } = useArchiveItems()
  const add = useAddFolder(); const upd = useUpdateFolder(); const del = useDeleteFolder()
  const [name, setName] = useState('')
  const [subFor, setSubFor] = useState<string | null>(null)
  const [subName, setSubName] = useState('')

  if (!open) return null
  const tree = buildFolderTree(folders)

  async function addTop() {
    const n = name.trim(); if (!n) return
    await add.mutateAsync({ name: n, sort_order: folders.length, parent_id: null })
    setName('')
  }
  async function addSub(parentId: string) {
    const n = subName.trim(); if (!n) return
    await add.mutateAsync({ name: n, sort_order: folders.length, parent_id: parentId })
    setSubName(''); setSubFor(null)
  }
  function canDelete(id: string): boolean {
    const hasItems = items.some((i) => i.folder_id === id)
    const hasChildren = folders.some((f) => f.parent_id === id)
    return !hasItems && !hasChildren
  }
  function tryDelete(id: string, label: string) {
    if (!canDelete(id)) { alert('폴더에 항목이나 하위폴더가 있어요. 먼저 비워주세요.'); return }
    if (confirm(`'${label}' 폴더를 삭제할까요?`)) del.mutate(id)
  }

  const nameInput = (id: string, current: string) => (
    <input
      defaultValue={current}
      onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== current) upd.mutate({ id, name: v }) }}
      className="flex-1 bg-card rounded-xl px-3 py-2 outline-none" />
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <span className="font-bold text-ink">폴더 관리</span>
          <button onClick={onClose} className="text-sub text-sm font-medium">닫기</button>
        </div>

        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="새 폴더 이름" className="flex-1 bg-card rounded-xl px-3 py-2 outline-none" />
          <button onClick={addTop} className="bg-brand text-white rounded-xl px-4 font-bold">추가</button>
        </div>

        <div className="space-y-3">
          {tree.map((top) => (
            <div key={top.id} className="space-y-2">
              <div className="flex items-center gap-2">
                {nameInput(top.id, top.name)}
                <button onClick={() => setSubFor(subFor === top.id ? null : top.id)} className="text-brand text-xs px-1">+하위</button>
                <button onClick={() => tryDelete(top.id, top.name)} className="text-[#F04452] text-sm px-1">삭제</button>
              </div>
              {subFor === top.id && (
                <div className="flex gap-2 pl-4">
                  <input value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="하위폴더 이름" className="flex-1 bg-card rounded-xl px-3 py-2 outline-none" />
                  <button onClick={() => addSub(top.id)} className="bg-brand text-white rounded-xl px-4 font-bold">추가</button>
                </div>
              )}
              {top.children.map((c) => (
                <div key={c.id} className="flex items-center gap-2 pl-4">
                  <span className="text-sub text-xs">└</span>
                  {nameInput(c.id, c.name)}
                  <button onClick={() => tryDelete(c.id, c.name)} className="text-[#F04452] text-sm px-1">삭제</button>
                </div>
              ))}
            </div>
          ))}
          {folders.length === 0 && <p className="text-sub text-sm text-center py-4">폴더가 없어요</p>}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 빌드 검증**

Run: `npm run build`
Expected: 성공.

- [ ] **Step 3: 커밋**

```bash
git add src/components/FolderSheet.tsx
git commit -m "feat: 폴더 관리 시트 서브폴더 추가 + 비었을 때만 삭제"
```

---

### Task 5: 좌측 폴더 드로어

**Files:**
- Create: `src/components/FolderDrawer.tsx`

**Interfaces:**
- Consumes: Task 2 `buildFolderTree`, `useFolders`
- Produces: `<FolderDrawer open onClose selected onSelect onManage />` (default export)
  - `selected: string`('all' 또는 folderId), `onSelect(key: string): void`, `onManage(): void`

- [ ] **Step 1: FolderDrawer 작성**

`src/components/FolderDrawer.tsx`:

```tsx
import { useState } from 'react'
import { useFolders } from '@/hooks/useArchive'
import { buildFolderTree } from '@/lib/archive'

export default function FolderDrawer(
  { open, onClose, selected, onSelect, onManage }:
  { open: boolean; onClose: () => void; selected: string; onSelect: (key: string) => void; onManage: () => void },
) {
  const { data: folders = [] } = useFolders()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  if (!open) return null
  const tree = buildFolderTree(folders)

  function pick(key: string) { onSelect(key); onClose() }
  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const rowCls = (key: string) =>
    `flex-1 text-left rounded-xl px-3 py-2 text-sm font-medium ${selected === key ? 'bg-brand text-white' : 'text-ink active:bg-card'}`

  return (
    <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose}>
      <div className="absolute left-0 top-0 h-full w-4/5 max-w-xs bg-white p-4 space-y-1 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold text-ink">폴더</span>
          <button onClick={onManage} className="text-sub text-sm">관리</button>
        </div>

        <button onClick={() => pick('all')} className={rowCls('all')}>전체</button>

        {tree.map((top) => (
          <div key={top.id}>
            <div className="flex items-center gap-1">
              {top.children.length > 0 ? (
                <button onClick={() => toggle(top.id)} className="w-6 text-sub text-xs shrink-0">{expanded.has(top.id) ? '▾' : '▸'}</button>
              ) : <span className="w-6 shrink-0" />}
              <button onClick={() => pick(top.id)} className={rowCls(top.id)}>{top.name}</button>
            </div>
            {expanded.has(top.id) && top.children.map((c) => (
              <div key={c.id} className="flex items-center gap-1 pl-6">
                <button onClick={() => pick(c.id)} className={rowCls(c.id)}>{c.name}</button>
              </div>
            ))}
          </div>
        ))}

        {folders.length === 0 && <p className="text-sub text-sm py-4">폴더가 없어요. '관리'에서 만들어 주세요.</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 빌드 검증**

Run: `npm run build`
Expected: 성공(아직 미사용 컴포넌트 — 트리셰이킹, 무방).

- [ ] **Step 3: 커밋**

```bash
git add src/components/FolderDrawer.tsx
git commit -m "feat: 좌측 폴더 드로어(전체 + 서브폴더 트리)"
```

---

### Task 6: 입력 시트 확장(사진·필수폴더·핀·기한·색상·보관)

**Files:**
- Modify (전체 교체): `src/components/ArchiveItemSheet.tsx`

**Interfaces:**
- Consumes: Task 2 타입/`buildFolderTree`/`ARCHIVE_COLORS`, Task 3 `uploadArchiveImage`/`useDeleteItem`(item)/`useAddItem`/`useUpdateItem`
- Produces: `<ArchiveItemSheet open onClose editing? defaultFolderId? />` (default export, props 동일)
  - 저장 payload에 `pinned/due_date/color/archived/folder_id` 포함, 폴더 미선택 시 저장 차단

- [ ] **Step 1: ArchiveItemSheet 전체 교체**

`src/components/ArchiveItemSheet.tsx`:

```tsx
import { useState } from 'react'
import { useFolders, useAddItem, useUpdateItem, useDeleteItem, fetchLinkPreview, uploadArchiveImage } from '@/hooks/useArchive'
import { normalizeUrl, buildFolderTree, ARCHIVE_COLORS } from '@/lib/archive'
import type { ArchiveColor, ArchiveItem, ArchiveKind, ChecklistEntry, LinkPreview } from '@/types'

const KIND_OPTIONS: { value: ArchiveKind; label: string }[] = [
  { value: 'memo', label: '메모' },
  { value: 'checklist', label: '체크리스트' },
  { value: 'link', label: '링크' },
  { value: 'image', label: '사진' },
]

export default function ArchiveItemSheet(
  { open, onClose, editing, defaultFolderId }:
  { open: boolean; onClose: () => void; editing?: ArchiveItem; defaultFolderId?: string | null },
) {
  const { data: folders = [] } = useFolders()
  const add = useAddItem(); const upd = useUpdateItem(); const del = useDeleteItem()

  const [kind, setKind] = useState<ArchiveKind>(editing?.kind ?? 'memo')
  const [folderId, setFolderId] = useState<string | null>(editing?.folder_id ?? defaultFolderId ?? null)
  const [title, setTitle] = useState(editing?.title ?? '')
  const [body, setBody] = useState(editing?.body ?? '')
  const [url, setUrl] = useState(editing?.url ?? '')
  const [preview, setPreview] = useState<LinkPreview | null>(editing?.preview ?? null)
  const [checklist, setChecklist] = useState<ChecklistEntry[]>(editing?.checklist ?? [{ text: '', done: false }])
  const [imageUrl, setImageUrl] = useState<string>(editing?.kind === 'image' ? (editing.url ?? '') : '')
  const [loadingPrev, setLoadingPrev] = useState(false)
  const [uploading, setUploading] = useState(false)
  // 공통 메타
  const [pinned, setPinned] = useState(editing?.pinned ?? false)
  const [dueDate, setDueDate] = useState(editing?.due_date ?? '')
  const [color, setColor] = useState<ArchiveColor | null>(editing?.color ?? null)
  const [archived, setArchived] = useState(editing?.archived ?? false)

  if (!open) return null

  // 폴더 옵션(계층 라벨): 최상위 → 서브 순서
  const orderedFolders = buildFolderTree(folders).flatMap((t) => [
    { id: t.id, label: t.name },
    ...t.children.map((c) => ({ id: c.id, label: `${t.name} / ${c.name}` })),
  ])

  async function loadPreview() {
    const norm = normalizeUrl(url)
    if (!norm) return
    setUrl(norm); setLoadingPrev(true)
    const p = await fetchLinkPreview(norm)
    setLoadingPrev(false)
    if (p) { setPreview(p); if (!title) setTitle(p.title) }
  }

  async function onPickImage(file: File | undefined) {
    if (!file) return
    setUploading(true)
    try { setImageUrl(await uploadArchiveImage(file)) }
    catch { alert('사진 업로드에 실패했어요.') }
    finally { setUploading(false) }
  }

  function setCheckText(i: number, text: string) { setChecklist((cs) => cs.map((c, idx) => idx === i ? { ...c, text } : c)) }
  function addCheckRow() { setChecklist((cs) => [...cs, { text: '', done: false }]) }
  function removeCheckRow(i: number) { setChecklist((cs) => cs.filter((_, idx) => idx !== i)) }

  const meta = { pinned, due_date: dueDate || null, color, archived }

  async function save() {
    if (!folderId) { alert('폴더를 선택해 주세요.'); return }
    let payload: Omit<ArchiveItem, 'id' | 'created_at' | 'updated_at'>
    if (kind === 'link') {
      const norm = normalizeUrl(url); if (!norm) return
      payload = { folder_id: folderId, kind, title: title.trim() || preview?.title || norm, body: null, url: norm, preview, checklist: null, ...meta }
    } else if (kind === 'image') {
      if (!imageUrl) { alert('사진을 선택해 주세요.'); return }
      payload = { folder_id: folderId, kind, title: title.trim(), body: null, url: imageUrl, preview: null, checklist: null, ...meta }
    } else if (kind === 'checklist') {
      const cleaned = checklist.filter((c) => c.text.trim()).map((c) => ({ text: c.text.trim(), done: c.done }))
      if (!title.trim() && cleaned.length === 0) return
      payload = { folder_id: folderId, kind, title: title.trim(), body: null, url: null, preview: null, checklist: cleaned, ...meta }
    } else {
      if (!title.trim() && !body.trim()) return
      payload = { folder_id: folderId, kind, title: title.trim(), body: body.trim() || null, url: null, preview: null, checklist: null, ...meta }
    }
    if (editing) await upd.mutateAsync({ id: editing.id, ...payload })
    else await add.mutateAsync(payload)
    onClose()
  }

  async function remove() {
    if (editing && confirm('이 항목을 삭제할까요?')) {
      await del.mutateAsync({ id: editing.id, kind: editing.kind, url: editing.url })
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <span className="font-bold text-ink">{editing ? '항목 수정' : '항목 추가'}</span>
          <button onClick={onClose} className="text-sub text-sm font-medium">닫기</button>
        </div>

        {!editing && (
          <div className="grid grid-cols-4 gap-2">
            {KIND_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => setKind(o.value)}
                className={`rounded-xl py-2 text-sm font-medium ${kind === o.value ? 'bg-brand text-white' : 'bg-card text-sub'}`}>
                {o.label}
              </button>
            ))}
          </div>
        )}

        <select value={folderId ?? ''} onChange={(e) => setFolderId(e.target.value || null)} className="w-full bg-card rounded-xl px-3 py-2 outline-none">
          <option value="" disabled>폴더 선택</option>
          {orderedFolders.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>

        {kind === 'link' ? (
          <>
            <div className="flex gap-2">
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="flex-1 bg-card rounded-xl px-3 py-2 outline-none" />
              <button onClick={loadPreview} disabled={loadingPrev} className="bg-brand text-white rounded-xl px-3 text-sm font-bold">{loadingPrev ? '…' : '미리보기'}</button>
            </div>
            {preview && (preview.image || preview.title) && (
              <div className="bg-card rounded-xl overflow-hidden">
                {preview.image && <img src={preview.image} alt="" className="w-full max-h-40 object-cover" />}
                <div className="p-3">
                  <p className="text-ink text-sm font-medium truncate">{preview.title || url}</p>
                  {preview.site && <p className="text-sub text-xs mt-0.5">{preview.site}</p>}
                </div>
              </div>
            )}
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목 (비우면 자동)" className="w-full bg-card rounded-xl px-3 py-2 outline-none" />
          </>
        ) : kind === 'image' ? (
          <>
            {imageUrl && <img src={imageUrl} alt="" className="w-full max-h-60 object-cover rounded-xl" />}
            <label className="block w-full bg-card rounded-xl px-3 py-2 text-sub text-sm text-center active:opacity-70">
              {uploading ? '업로드 중…' : (imageUrl ? '사진 변경' : '앨범에서 사진 선택')}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickImage(e.target.files?.[0])} />
            </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목 (선택)" className="w-full bg-card rounded-xl px-3 py-2 outline-none" />
          </>
        ) : kind === 'checklist' ? (
          <>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" className="w-full bg-card rounded-xl px-3 py-2 outline-none" />
            <div className="space-y-2">
              {checklist.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={c.text} onChange={(e) => setCheckText(i, e.target.value)} placeholder={`할일 ${i + 1}`} className="flex-1 bg-card rounded-xl px-3 py-2 outline-none" />
                  <button onClick={() => removeCheckRow(i)} className="text-sub text-sm px-2">✕</button>
                </div>
              ))}
              <button onClick={addCheckRow} className="text-brand text-sm font-medium">+ 할일 추가</button>
            </div>
          </>
        ) : (
          <>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" className="w-full bg-card rounded-xl px-3 py-2 outline-none" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="내용" rows={5} className="w-full bg-card rounded-xl px-3 py-2 outline-none resize-none" />
          </>
        )}

        {/* 공통 메타: 핀 / 기한 / 색상 / 보관 */}
        <div className="border-t border-card pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sub text-sm">기한</span>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="bg-card rounded-xl px-3 py-2 outline-none text-sm" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sub text-sm">색상</span>
            <div className="flex gap-2 items-center">
              <button onClick={() => setColor(null)} className={`w-6 h-6 rounded-full border ${color === null ? 'border-ink' : 'border-card'} text-sub text-xs`}>×</button>
              {ARCHIVE_COLORS.map((c) => (
                <button key={c.key} onClick={() => setColor(c.key)} style={{ backgroundColor: c.hex }}
                  className={`w-6 h-6 rounded-full ${color === c.key ? 'ring-2 ring-offset-1 ring-ink' : ''}`} />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button onClick={() => setPinned((v) => !v)} className={`rounded-xl px-3 py-1.5 text-sm font-medium ${pinned ? 'bg-brand text-white' : 'bg-card text-sub'}`}>{pinned ? '고정됨' : '고정'}</button>
            <button onClick={() => setArchived((v) => !v)} className={`rounded-xl px-3 py-1.5 text-sm font-medium ${archived ? 'bg-ink text-white' : 'bg-card text-sub'}`}>{archived ? '보관됨' : '보관'}</button>
          </div>
        </div>

        <button onClick={save} className="w-full bg-brand text-white rounded-2xl py-3 font-bold">저장하기</button>
        {editing && <button onClick={remove} className="w-full text-[#F04452] text-sm py-1">삭제</button>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 빌드 검증**

Run: `npm run build`
Expected: 성공.

- [ ] **Step 3: 커밋**

```bash
git add src/components/ArchiveItemSheet.tsx
git commit -m "feat: 입력 시트 사진 업로드·필수 폴더(계층)·핀·기한·색상·보관"
```

---

### Task 7: 화면 재구성(드로어·정렬·보관·배지·사진)

**Files:**
- Modify (전체 교체): `src/screens/ArchiveScreen.tsx`

**Interfaces:**
- Consumes: Task 2(`checklistProgress`, `sortItems`, `dueStatus`, `ARCHIVE_COLORS`), Task 3 훅, Task 5 `FolderDrawer`, Task 6 `ArchiveItemSheet`, `FolderSheet`
- Produces: `<ArchiveScreen />` (default export) — 드로어 탐색 + 정렬 + 보관 토글 + 배지

- [ ] **Step 1: ArchiveScreen 전체 교체**

`src/screens/ArchiveScreen.tsx`:

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFolders, useArchiveItems, useToggleCheck } from '@/hooks/useArchive'
import { checklistProgress, sortItems, dueStatus, ARCHIVE_COLORS } from '@/lib/archive'
import ArchiveItemSheet from '@/components/ArchiveItemSheet'
import FolderSheet from '@/components/FolderSheet'
import FolderDrawer from '@/components/FolderDrawer'
import type { ArchiveColor, ArchiveItem, SortMode } from '@/types'

const SORT_LABEL: Record<SortMode, string> = {
  updated: '최근수정', created: '생성순', name: '이름순', due: '기한순',
}
const COLOR_HEX: Record<ArchiveColor, string> = Object.fromEntries(
  ARCHIVE_COLORS.map((c) => [c.key, c.hex]),
) as Record<ArchiveColor, string>

function todayISO(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

export default function ArchiveScreen() {
  const nav = useNavigate()
  const { data: folders = [] } = useFolders()
  const { data: items = [] } = useArchiveItems()
  const toggle = useToggleCheck()

  const [sel, setSel] = useState<string>('all') // 'all' | folderId
  const [sort, setSort] = useState<SortMode>('updated')
  const [showArchived, setShowArchived] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<ArchiveItem | null>(null)
  const [manageFolders, setManageFolders] = useState(false)

  const today = todayISO()
  const viewName = sel === 'all' ? '전체' : (folders.find((f) => f.id === sel)?.name ?? '전체')

  const filtered = items
    .filter((i) => i.archived === showArchived)
    .filter((i) => sel === 'all' ? true : i.folder_id === sel)
  const shown = sortItems(filtered, sort)

  function DueBadge({ due }: { due: string | null }) {
    const s = dueStatus(due, today)
    if (!s) return null
    const label = s.kind === 'overdue' ? '지남' : s.kind === 'today' ? '오늘' : `D-${s.days}`
    const cls = s.kind === 'overdue' ? 'text-[#F04452]' : s.kind === 'today' ? 'text-brand' : 'text-sub'
    return <span className={`text-[10px] font-medium ${cls}`}>{label}</span>
  }
  function Badges({ it }: { it: ArchiveItem }) {
    return (
      <span className="flex items-center gap-1.5 shrink-0">
        <DueBadge due={it.due_date} />
        {it.pinned && <span className="text-[10px] text-brand">고정</span>}
      </span>
    )
  }
  const stripStyle = (c: ArchiveColor | null) =>
    c ? { borderLeft: `4px solid ${COLOR_HEX[c]}` } : undefined

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setDrawer(true)} className="text-ink text-xl">☰</button>
          <h1 className="text-xl font-bold text-ink">{viewName}</h1>
        </div>
        <button onClick={() => nav('/')} className="text-sub text-sm">홈</button>
      </div>

      <div className="flex items-center justify-between">
        <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)} className="bg-card rounded-xl px-3 py-1.5 text-sm outline-none">
          {(Object.keys(SORT_LABEL) as SortMode[]).map((k) => <option key={k} value={k}>{SORT_LABEL[k]}</option>)}
        </select>
        <button onClick={() => setShowArchived((v) => !v)} className={`rounded-xl px-3 py-1.5 text-sm font-medium ${showArchived ? 'bg-ink text-white' : 'bg-card text-sub'}`}>
          {showArchived ? '보관됨' : '보관함'}
        </button>
      </div>

      {folders.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <p className="text-sub text-sm">폴더를 먼저 만들어 주세요.</p>
          <button onClick={() => setManageFolders(true)} className="bg-brand text-white rounded-2xl px-5 py-2.5 font-bold">폴더 만들기</button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {shown.length === 0 && <p className="text-sub text-sm text-center py-8">항목이 없어요</p>}
            {shown.map((it) => {
              if (it.kind === 'link') {
                return (
                  <div key={it.id} className="bg-card rounded-2xl overflow-hidden" style={stripStyle(it.color)}>
                    <a href={it.url ?? '#'} target="_blank" rel="noreferrer" className="block active:opacity-70">
                      {it.preview?.image && <img src={it.preview.image} alt="" className="w-full max-h-40 object-cover" />}
                      <div className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-ink font-medium truncate">{it.title || it.url}</p>
                          <Badges it={it} />
                        </div>
                        {it.preview?.site && <p className="text-sub text-xs mt-1">{it.preview.site}</p>}
                      </div>
                    </a>
                    <button onClick={() => setEditing(it)} className="w-full text-right text-sub text-xs px-4 pb-3">편집</button>
                  </div>
                )
              }
              if (it.kind === 'image') {
                return (
                  <button key={it.id} onClick={() => setEditing(it)} className="w-full text-left bg-card rounded-2xl overflow-hidden active:opacity-70" style={stripStyle(it.color)}>
                    {it.url && <img src={it.url} alt="" className="w-full max-h-60 object-cover" />}
                    <div className="p-3 flex items-center justify-between gap-2">
                      <p className="text-ink font-medium truncate">{it.title || '사진'}</p>
                      <Badges it={it} />
                    </div>
                  </button>
                )
              }
              if (it.kind === 'checklist') {
                const { done, total } = checklistProgress(it.checklist)
                return (
                  <div key={it.id} className="bg-card rounded-2xl p-4" style={stripStyle(it.color)}>
                    <button onClick={() => setEditing(it)} className="w-full text-left active:opacity-70">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-ink font-medium truncate">{it.title || '체크리스트'}</span>
                        <span className="flex items-center gap-2 shrink-0"><Badges it={it} /><span className="text-sub text-xs">{done}/{total}</span></span>
                      </div>
                    </button>
                    <div className="mt-3 space-y-2">
                      {(it.checklist ?? []).map((c, i) => (
                        <button key={i} onClick={() => toggle.mutate({ item: it, index: i })} className="flex items-center gap-2 w-full text-left active:opacity-70">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 ${c.done ? 'bg-brand text-white' : 'bg-white text-transparent border border-sub/30'}`}>✓</span>
                          <span className={`text-sm ${c.done ? 'text-sub line-through' : 'text-ink'}`}>{c.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              }
              return (
                <button key={it.id} onClick={() => setEditing(it)} className="w-full text-left bg-card rounded-2xl p-4 active:opacity-70" style={stripStyle(it.color)}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-ink font-medium truncate">{it.title || '메모'}</p>
                    <Badges it={it} />
                  </div>
                  {it.body && <p className="text-sub text-sm mt-1 whitespace-pre-wrap line-clamp-3">{it.body}</p>}
                </button>
              )
            })}
          </div>

          <button onClick={() => setAdding(true)} className="w-full bg-brand text-white rounded-2xl py-3 font-bold">항목 추가</button>
        </>
      )}

      <FolderDrawer open={drawer} onClose={() => setDrawer(false)} selected={sel} onSelect={setSel} onManage={() => { setDrawer(false); setManageFolders(true) }} />
      {adding && <ArchiveItemSheet open onClose={() => setAdding(false)} defaultFolderId={sel !== 'all' ? sel : null} />}
      {editing && <ArchiveItemSheet open onClose={() => setEditing(null)} editing={editing} />}
      {manageFolders && <FolderSheet open onClose={() => setManageFolders(false)} />}
    </div>
  )
}
```

- [ ] **Step 2: 미사용된 countByFolder 제거**

새 `ArchiveScreen`는 `countByFolder`를 쓰지 않는다. 이제 안전하게 제거:
- `src/lib/archive.ts`에서 `countByFolder` 함수(및 위의 "Task 7에서 … 제거 예정" 주석) 삭제.
- `src/lib/archive.test.ts`에서 `countByFolder` import와 그 `describe('countByFolder', …)` 블록 삭제.

- [ ] **Step 3: 빌드 + 전체 테스트**

Run: `npm run build && npx vitest run`
Expected: 빌드 성공, 테스트 전부 통과(countByFolder 참조가 어디에도 남지 않음).

- [ ] **Step 4: 커밋**

```bash
git add src/screens/ArchiveScreen.tsx src/lib/archive.ts src/lib/archive.test.ts
git commit -m "feat: 아카이빙 화면 재구성(드로어·정렬·보관·색/기한/핀 배지·사진) + countByFolder 제거"
```

---

## 최종 검증 (구현 완료 후)

- [ ] `npm run build` 통과, `npx vitest run` 전부 통과.
- [ ] 사용자: `supabase/schema-archive-2.sql` 실행(컬럼·kind·버킷·정책). Storage에 `archive` 버킷(public) 생성 확인.
- [ ] 사용자: Vercel 재배포 후 두 계정 로그인 →
  - 좌측 드로어로 폴더/전체 전환, 서브폴더 생성·탐색
  - 카드 추가 시 폴더 필수(미분류 없음), 전체 뷰에서 폴더 선택 요구
  - 사진: 앨범에서 선택 업로드 → 카드 썸네일, 삭제 시 사라짐
  - 핀·정렬(기한순 등)·기한 배지·색상 스트립·보관 토글
  - 실시간 동기화(한쪽 변경 → 다른 폰 반영)

## 알려진 폴백/주의

- 로컬 dev는 `/api/preview`·Storage 업로드가 실제 Supabase로 나가므로 링크 미리보기는 로컬에서도 폴백(수동), 사진 업로드는 실제 버킷 필요(마이그레이션 후 동작).
- `folder_id`는 DB nullable 유지, 앱에서 필수 강제. 1단계에서 만든 null-folder 카드가 있으면 "전체" 뷰에 보이며 편집으로 폴더 지정 가능.
- 색상 hex는 `ARCHIVE_COLORS` 단일 출처(시트·화면 공유).
- 폴더 삭제는 비었을 때만(항목·하위폴더 0). `on delete restrict`가 DB 안전망.
