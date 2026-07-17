import { useState } from 'react'
import { useFolders, useArchiveItems } from '@/hooks/useArchive'
import { sortItems, dueStatus, buildFolderTree, ARCHIVE_COLORS } from '@/lib/archive'
import { todayISO } from '@/lib/date'
import ArchiveItemSheet from '@/components/ArchiveItemSheet'
import FolderSheet from '@/components/FolderSheet'
import FolderDrawer from '@/components/FolderDrawer'
import ChecklistCard from '@/components/ChecklistCard'
import NavButton from '@/components/NavButton'
import type { ArchiveColor, ArchiveItem, SortMode } from '@/types'

const SORT_LABEL: Record<SortMode, string> = {
  updated: '최근수정', created: '생성순', name: '이름순', due: '기한순',
}
const COLOR_HEX: Record<ArchiveColor, string> = Object.fromEntries(
  ARCHIVE_COLORS.map((c) => [c.key, c.hex]),
) as Record<ArchiveColor, string>

// 보기: 1=세로형(리스트), 2/3=바둑판(다단)
function readCols(): number {
  const v = Number(localStorage.getItem('archive_cols'))
  return v === 2 || v === 3 ? v : 1
}

// 메모: 기본 2줄까지만(길면 ...로 잘림), 탭하면 전체 펼침·다시 탭하면 접힘
function MemoBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <button onClick={() => setOpen((v) => !v)} className="block w-full text-left px-4 pb-3 active:opacity-70">
      <p className={`text-sub text-sm whitespace-pre-wrap ${open ? '' : 'line-clamp-2'}`}>{text}</p>
    </button>
  )
}

export default function ArchiveScreen() {
  const { data: folders = [] } = useFolders()
  const { data: items = [] } = useArchiveItems()

  const [sel, setSel] = useState<string>('all') // 'all' | folderId
  const [sort, setSort] = useState<SortMode>('updated')
  const [showArchived, setShowArchived] = useState(false)
  const [cols, setCols] = useState<number>(readCols)
  const [drawer, setDrawer] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<ArchiveItem | null>(null)
  const [manageFolders, setManageFolders] = useState(false)

  const today = todayISO()
  // 선택한 폴더가 삭제되면 stale id로 남지 않도록 '전체'로 폴백(추가 시 FK 에러 방지)
  const effSel = sel !== 'all' && !folders.some((f) => f.id === sel) ? 'all' : sel
  const viewName = effSel === 'all' ? '전체' : (folders.find((f) => f.id === effSel)?.name ?? '전체')

  const filtered = items
    .filter((i) => i.archived === showArchived)
    .filter((i) => effSel === 'all' ? true : i.folder_id === effSel)
  const shown = sortItems(filtered, sort)

  function changeCols(n: number) {
    setCols(n)
    localStorage.setItem('archive_cols', String(n))
  }

  // 전체 뷰: 폴더 순서(드로어와 동일, 상위→서브)대로 그룹핑. 항목 없는 폴더는 숨김.
  const orderedFolders = buildFolderTree(folders).flatMap((t) => [
    { id: t.id, label: t.name },
    ...t.children.map((c) => ({ id: c.id, label: `${t.name} / ${c.name}` })),
  ])
  const knownIds = new Set(orderedFolders.map((f) => f.id))
  const orphans = shown.filter((i) => !i.folder_id || !knownIds.has(i.folder_id))
  const groups = [
    ...orderedFolders
      .map((f) => ({ id: f.id, label: f.label, items: shown.filter((i) => i.folder_id === f.id) }))
      .filter((g) => g.items.length > 0),
    ...(orphans.length ? [{ id: '__none__', label: '폴더 없음', items: orphans }] : []),
  ]

  function DueBadge({ due }: { due: string | null }) {
    const s = dueStatus(due, today)
    if (!s) return null
    const label =
      s.kind === 'overdue' ? `${-s.days}일 지남` : s.kind === 'today' ? '오늘 마감' : `D-${s.days}`
    // 지남·오늘은 채운 빨강, 남은 기한은 연빨강 — 급할수록 진하게
    const cls =
      s.kind === 'upcoming'
        ? 'bg-danger/10 text-danger'
        : 'bg-danger text-white'
    return (
      <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 leading-tight ${cls}`}>
        {label}
      </span>
    )
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

  // 카드 1장(래퍼/키는 renderBoard가 담당). 컴포넌트가 아닌 함수로 호출 → MemoBlock 상태 보존
  function renderCard(it: ArchiveItem) {
    if (it.kind === 'link') {
      return (
        <div className="bg-card rounded-2xl overflow-hidden" style={stripStyle(it.color)}>
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
          {it.body && <MemoBlock text={it.body} />}
          <button onClick={() => setEditing(it)} className="w-full text-right text-sub text-xs px-4 pb-3">편집</button>
        </div>
      )
    }
    if (it.kind === 'image') {
      return (
        <div className="bg-card rounded-2xl overflow-hidden" style={stripStyle(it.color)}>
          <button onClick={() => setEditing(it)} className="w-full text-left active:opacity-70">
            {it.url && <img src={it.url} alt="" className="w-full max-h-60 object-cover" />}
            <div className="p-3 flex items-center justify-between gap-2">
              <p className="text-ink font-medium truncate">{it.title || '사진'}</p>
              <Badges it={it} />
            </div>
          </button>
          {it.body && <MemoBlock text={it.body} />}
        </div>
      )
    }
    // 남은 종류는 checklist 뿐이다
    return <ChecklistCard item={it} onEdit={() => setEditing(it)} badges={<Badges it={it} />} />
  }

  // cols=1: 세로 스택 / cols>=2: CSS 다단(카드 안 잘림)
  const boardCls = cols === 1 ? 'space-y-3' : cols === 2 ? 'columns-2 gap-3' : 'columns-3 gap-3'
  const wrapCls = cols === 1 ? '' : 'mb-3 break-inside-avoid'
  function renderBoard(list: ArchiveItem[]) {
    return (
      <div className={boardCls}>
        {list.map((it) => (
          <div key={it.id} className={wrapCls}>{renderCard(it)}</div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setDrawer(true)} className="text-ink text-xl">☰</button>
          <h1 className="text-xl font-bold text-ink">{viewName}</h1>
        </div>
        <NavButton to="/" label="홈" />
      </div>

      <div className="flex items-center justify-between">
        <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)} className="bg-card rounded-xl px-3 py-1.5 text-sm outline-none">
          {(Object.keys(SORT_LABEL) as SortMode[]).map((k) => <option key={k} value={k}>{SORT_LABEL[k]}</option>)}
        </select>
        <button onClick={() => setShowArchived((v) => !v)} className={`rounded-xl px-3 py-1.5 text-sm font-medium ${showArchived ? 'bg-ink text-bg' : 'bg-card text-sub'}`}>
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
          <button onClick={() => setAdding(true)} className="w-full bg-brand text-white rounded-2xl py-3 font-bold">항목 추가</button>

          {shown.length === 0 ? (
            <p className="text-sub text-sm text-center py-8">항목이 없어요</p>
          ) : effSel === 'all' ? (
            <div className="space-y-5">
              {groups.map((g) => (
                <div key={g.id}>
                  <h2 className="text-sub text-sm font-bold mb-2 px-1">{g.label}</h2>
                  {renderBoard(g.items)}
                </div>
              ))}
            </div>
          ) : (
            renderBoard(shown)
          )}
        </>
      )}

      <FolderDrawer open={drawer} onClose={() => setDrawer(false)} selected={effSel} onSelect={setSel} onManage={() => { setDrawer(false); setManageFolders(true) }} cols={cols} onCols={changeCols} />
      {adding && <ArchiveItemSheet open onClose={() => setAdding(false)} defaultFolderId={effSel !== 'all' ? effSel : null} />}
      {editing && <ArchiveItemSheet open onClose={() => setEditing(null)} editing={editing} />}
      {manageFolders && <FolderSheet open onClose={() => setManageFolders(false)} />}
    </div>
  )
}
