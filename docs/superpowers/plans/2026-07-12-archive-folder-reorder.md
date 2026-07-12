# 아카이빙 폴더 드래그 순서변경 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 좌측 폴더 드로어에서 폴더를 길게 눌러 드래그해 순서를 바꾸고, 그 순서를 `sort_order`로 저장·실시간 동기화한다.

**Architecture:** 순수 배열 이동 함수 `moveItem`(TDD) + 그룹 sort_order 일괄 업데이트 훅 `useReorderFolders` + `FolderDrawer`의 Pointer Events 기반 long-press 드래그. DB 스키마 변경 없음(`sort_order` 재사용).

**Tech Stack:** React 19(Pointer Events), @tanstack/react-query 5, @supabase/supabase-js 2, Vitest.

## Global Constraints

- 신규 npm 의존성 추가 금지(드래그도 라이브러리 없이 Pointer Events로 구현).
- 토스 스타일 유지(`bg-card`, `text-ink`/`text-sub`/`text-brand`, `bg-brand`). import 별칭 `@/`.
- 범위: 같은 그룹(최상위끼리 / 같은 부모의 서브폴더끼리) 내 순서변경만. 부모 변경(다른 폴더로 이동) 없음. `전체` 행은 드래그 대상 아님.
- 조작: 길게 눌러(≈300ms) 드래그 진입, 짧게 탭은 폴더 선택. DB 마이그레이션·사용자 SQL 불필요.

---

### Task 1: moveItem 순수 함수 (TDD)

**Files:**
- Modify: `src/lib/archive.ts`
- Modify: `src/lib/archive.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `moveItem<T>(arr: T[], from: number, to: number): T[]` — 원소를 from→to로 옮긴 새 배열(불변). 범위 밖/동일 인덱스는 원본 복사본 반환.

- [ ] **Step 1: 실패하는 테스트 추가**

먼저 `src/lib/archive.test.ts` 상단의 기존 import에 `moveItem`을 추가한다. 현재:
```ts
import {
  checklistProgress, normalizeUrl,
  buildFolderTree, sortItems, dueStatus, storagePathFromPublicUrl,
} from './archive'
```
→ `moveItem`을 목록에 추가(예: `storagePathFromPublicUrl, moveItem,`).

그런 다음 파일 끝에 describe 블록을 추가:

```ts
describe('moveItem', () => {
  it('중간 원소를 앞으로 이동', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 2, 0)).toEqual(['c', 'a', 'b', 'd'])
  })
  it('앞 원소를 뒤로 이동', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
  })
  it('같은 인덱스는 그대로', () => {
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c'])
  })
  it('범위 밖은 원본 복사본', () => {
    expect(moveItem(['a', 'b'], 5, 0)).toEqual(['a', 'b'])
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b'])
  })
  it('원본을 변형하지 않는다', () => {
    const src = ['a', 'b', 'c']
    moveItem(src, 0, 2)
    expect(src).toEqual(['a', 'b', 'c'])
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/archive.test.ts`
Expected: FAIL — `moveItem`이 export되지 않음.

- [ ] **Step 3: 구현 추가**

`src/lib/archive.ts` 파일 끝(또는 적당한 위치)에 추가:

```ts
export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const copy = [...arr]
  if (from < 0 || from >= copy.length || to < 0 || to >= copy.length || from === to) return copy
  const [x] = copy.splice(from, 1)
  copy.splice(to, 0, x)
  return copy
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/archive.test.ts`
Expected: PASS (moveItem describe 포함 전부 통과).

- [ ] **Step 5: 커밋**

```bash
git add src/lib/archive.ts src/lib/archive.test.ts
git commit -m "feat: moveItem 순수 배열 이동 함수 (드래그 순서변경용) TDD"
```

---

### Task 2: useReorderFolders 훅

**Files:**
- Modify: `src/hooks/useArchive.ts`

**Interfaces:**
- Consumes: 없음(supabase client, react-query)
- Produces: `useReorderFolders()` — mutate(`{ id: string; sort_order: number }[]`): 각 폴더 `sort_order`를 일괄 업데이트, onSuccess `['folders']` 무효화.

- [ ] **Step 1: 훅 추가**

`src/hooks/useArchive.ts`의 폴더 관련 훅 근처(예: `useDeleteFolder` 아래)에 추가:

```ts
export function useReorderFolders() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      await Promise.all(updates.map(({ id, sort_order }) =>
        supabase.from('archive_folders').update({ sort_order }).eq('id', id)
          .then(({ error }) => { if (error) throw error })))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }),
  })
}
```

(기존 `useMutation`, `useQueryClient`, `supabase` import는 이미 있음)

- [ ] **Step 2: 빌드 검증**

Run: `npm run build`
Expected: 성공(아직 미사용 export — 트리셰이킹, 무방).

- [ ] **Step 3: 커밋**

```bash
git add src/hooks/useArchive.ts
git commit -m "feat: useReorderFolders 훅 (그룹 sort_order 일괄 갱신)"
```

---

### Task 3: FolderDrawer 롱프레스 드래그 순서변경

**Files:**
- Modify (전체 교체): `src/components/FolderDrawer.tsx`

**Interfaces:**
- Consumes: Task 1 `moveItem`, Task 2 `useReorderFolders`, 기존 `useFolders`/`buildFolderTree`
- Produces: `<FolderDrawer open onClose selected onSelect onManage />` (default export, props 동일). 길게 눌러 드래그로 같은 그룹 내 순서변경, 짧게 탭은 선택 유지.

- [ ] **Step 1: FolderDrawer 전체 교체**

`src/components/FolderDrawer.tsx`:

```tsx
import { useReducer, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useFolders, useReorderFolders } from '@/hooks/useArchive'
import { buildFolderTree, moveItem } from '@/lib/archive'
import type { ArchiveFolder } from '@/types'

type DragState = { group: string; ids: string[]; activeId: string } | null
const LONG_PRESS_MS = 300
const MOVE_THRESHOLD = 6

export default function FolderDrawer(
  { open, onClose, selected, onSelect, onManage }:
  { open: boolean; onClose: () => void; selected: string; onSelect: (key: string) => void; onManage: () => void },
) {
  const { data: folders = [] } = useFolders()
  const reorder = useReorderFolders()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const dragRef = useRef<DragState>(null)
  const pressRef = useRef<{ id: string; timer: number; dragging: boolean; sx: number; sy: number } | null>(null)
  const rowRefs = useRef<Record<string, HTMLElement | null>>({})
  const [, force] = useReducer((x: number) => x + 1, 0)

  if (!open) return null
  const tree = buildFolderTree(folders)

  function pick(key: string) { onSelect(key); onClose() }
  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  function orderedIds(groupKey: string, naturalIds: string[]): string[] {
    const d = dragRef.current
    return d && d.group === groupKey ? d.ids : naturalIds
  }

  function onPointerDown(e: ReactPointerEvent, id: string, group: string, siblingIds: string[]) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const el = e.currentTarget as HTMLElement
    const pid = e.pointerId
    const sx = e.clientX, sy = e.clientY
    const timer = window.setTimeout(() => {
      if (!pressRef.current) return
      pressRef.current.dragging = true
      try { el.setPointerCapture(pid) } catch { /* noop */ }
      dragRef.current = { group, ids: siblingIds, activeId: id }
      force()
    }, LONG_PRESS_MS)
    pressRef.current = { id, timer, dragging: false, sx, sy }
  }

  function onPointerMove(e: ReactPointerEvent) {
    const p = pressRef.current
    if (!p) return
    if (!p.dragging) {
      if (Math.abs(e.clientY - p.sy) > MOVE_THRESHOLD || Math.abs(e.clientX - p.sx) > MOVE_THRESHOLD) {
        clearTimeout(p.timer); pressRef.current = null
      }
      return
    }
    e.preventDefault()
    const d = dragRef.current
    if (!d) return
    const cur = d.ids.indexOf(d.activeId)
    let target = cur
    for (let i = 0; i < d.ids.length; i++) {
      const rowEl = rowRefs.current[d.ids[i]]
      if (!rowEl) continue
      const r = rowEl.getBoundingClientRect()
      const mid = r.top + r.height / 2
      if (e.clientY < mid) { target = i; break }
      target = i
    }
    if (target !== cur) { dragRef.current = { ...d, ids: moveItem(d.ids, cur, target) }; force() }
  }

  function onPointerUp() {
    const p = pressRef.current
    if (!p) return
    clearTimeout(p.timer)
    if (p.dragging) {
      const d = dragRef.current
      if (d) reorder.mutate(d.ids.map((id, i) => ({ id, sort_order: i })))
      dragRef.current = null
      force()
    } else {
      pick(p.id)
    }
    pressRef.current = null
  }

  function onPointerCancel() {
    const p = pressRef.current
    if (p) clearTimeout(p.timer)
    pressRef.current = null
    if (dragRef.current) { dragRef.current = null; force() }
  }

  const rowCls = (key: string) =>
    `flex-1 text-left rounded-xl px-3 py-2 text-sm font-medium ${selected === key ? 'bg-brand text-white' : 'text-ink active:bg-card'}`

  function FolderButton({ f, group, siblingIds }: { f: ArchiveFolder; group: string; siblingIds: string[] }) {
    const dragging = dragRef.current?.activeId === f.id
    return (
      <button
        ref={(el) => { rowRefs.current[f.id] = el }}
        onPointerDown={(e) => onPointerDown(e, f.id, group, siblingIds)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{ touchAction: 'pan-y' }}
        className={`${rowCls(f.id)} ${dragging ? 'opacity-70 scale-[1.02] ring-2 ring-brand/40' : ''}`}>
        {f.name}
      </button>
    )
  }

  const topIds = tree.map((t) => t.id)
  const topById = new Map(tree.map((t) => [t.id, t]))
  const topOrder = orderedIds('top', topIds)

  return (
    <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose}>
      <div className="absolute left-0 top-0 h-full w-4/5 max-w-xs bg-white p-4 space-y-1 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold text-ink">폴더</span>
          <button onClick={onManage} className="text-sub text-sm">관리</button>
        </div>

        <button onClick={() => pick('all')} className={rowCls('all')}>전체</button>

        {topOrder.map((tid) => {
          const top = topById.get(tid)
          if (!top) return null
          const childIds = top.children.map((c) => c.id)
          const childById = new Map(top.children.map((c) => [c.id, c]))
          const childOrder = orderedIds(top.id, childIds)
          const isExpanded = expanded.has(top.id)
          return (
            <div key={top.id}>
              <div className="flex items-center gap-1">
                {top.children.length > 0 ? (
                  <button onClick={() => toggleExpand(top.id)} className="w-6 text-sub text-xs shrink-0">{isExpanded ? '▾' : '▸'}</button>
                ) : <span className="w-6 shrink-0" />}
                <FolderButton f={top} group="top" siblingIds={topIds} />
              </div>
              {isExpanded && childOrder.map((cid) => {
                const c = childById.get(cid)
                if (!c) return null
                return (
                  <div key={c.id} className="flex items-center gap-1 pl-6">
                    <FolderButton f={c} group={top.id} siblingIds={childIds} />
                  </div>
                )
              })}
            </div>
          )
        })}

        {folders.length === 0 && <p className="text-sub text-sm py-4">폴더가 없어요. '관리'에서 만들어 주세요.</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 빌드 + 테스트**

Run: `npm run build && npx vitest run`
Expected: 빌드 성공, 테스트 전부 통과.

- [ ] **Step 3: 커밋**

```bash
git add src/components/FolderDrawer.tsx
git commit -m "feat: 폴더 드로어 롱프레스 드래그 순서변경(그룹 내, 탭 선택 유지)"
```

---

## 최종 검증 (구현 완료 후)

- [ ] `npm run build` 통과, `npx vitest run` 전부 통과.
- [ ] DB 변경 없음 → 사용자 SQL 불필요. 배포(push)만 하면 됨.
- [ ] 배포본에서 두 계정:
  - 맥(마우스): 폴더 이름을 잠깐 누른 뒤 드래그 → 순서 변경, 놓으면 저장.
  - 폰(터치): 폴더 길게 눌러 드래그 → 순서 변경.
  - 짧게 탭은 여전히 폴더 선택.
  - 서브폴더 펼친 상태에서 같은 부모 안 서브폴더끼리 순서 변경.
  - 한쪽에서 바꾼 순서가 다른 폰에 실시간 반영.

## 알려진 한계/주의

- 드래그는 **같은 그룹 내**에서만(부모 변경 없음). `전체` 행은 고정.
- 롱프레스 대기(≈300ms) 중 큰 이동은 드래그 취소(스크롤/탭으로 간주). 드로어 스크롤은 `touch-action: pan-y`로 유지.
- 마우스도 "잠깐 누른 뒤 드래그"(길게 눌러 드래그 규칙 동일). 즉시 드래그가 아니라 약간의 홀드 필요.
- 그룹별 `sort_order`를 0부터 재부여 → 그룹 간 값이 겹칠 수 있으나 표시엔 무해(그룹별 filter 후 상대 순서만 사용).
