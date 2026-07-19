import { useState } from 'react'
import { useAddBlock, useUpdateBlock, useDeleteBlock, useBlockGroups, useAddGroup } from '@/hooks/useTimeBlocks'
import { ARCHIVE_COLORS } from '@/lib/archive'
import { showToast } from '@/lib/toast'
import BlockIcon, { BLOCK_ICONS } from '@/components/BlockIcon'
import type { ArchiveColor, TimeBlock } from '@/types'

const NAME_MAX = 16
const GROUP_MAX = 20

export default function TimeBlockSheet(
  { open, onClose, editing, nextOrder }:
  { open: boolean; onClose: () => void; editing?: TimeBlock; nextOrder: number },
) {
  const { data: groups = [] } = useBlockGroups()
  const add = useAddBlock(); const upd = useUpdateBlock(); const del = useDeleteBlock()
  const addGroup = useAddGroup()

  const [name, setName] = useState(editing?.name ?? '')
  const [icon, setIcon] = useState(editing?.icon ?? BLOCK_ICONS[0].key)
  const [color, setColor] = useState<ArchiveColor | null>(editing?.color ?? null)
  const [groupId, setGroupId] = useState<string | null>(editing?.group_id ?? null)
  const [newGroup, setNewGroup] = useState('')
  const [addingGroup, setAddingGroup] = useState(false)

  if (!open) return null

  async function createGroup() {
    const n = newGroup.trim()
    if (!n) { showToast('그룹 이름을 입력해 주세요.'); return }
    try {
      const id = await addGroup.mutateAsync({ name: n, sort_order: groups.length })
      setGroupId(id); setNewGroup(''); setAddingGroup(false)
    } catch { /* 전역 토스트 */ }
  }

  async function save() {
    const n = name.trim()
    if (!n) { showToast('작업명을 입력해 주세요.'); return }
    try {
      if (editing) await upd.mutateAsync({ id: editing.id, name: n, icon, color, group_id: groupId })
      else await add.mutateAsync({ name: n, icon, color, group_id: groupId, sort_order: nextOrder })
      onClose()
    } catch { /* 실패 시 시트를 열어둔다(사유는 전역 토스트로 안내) */ }
  }

  async function remove() {
    if (!editing) return
    if (!confirm(`'${editing.name}' 블럭을 삭제할까요?\n이 블럭에 쌓인 기록도 함께 지워집니다.`)) return
    try { await del.mutateAsync(editing.id); onClose() } catch { /* 전역 토스트 */ }
  }

  const colorHex = ARCHIVE_COLORS.find((c) => c.key === color)?.hex

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dim" onClick={onClose}>
      <div className="w-full max-w-md bg-surface rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <button onClick={onClose} className="text-sub text-sm font-medium">닫기</button>
          <span className="font-bold text-ink">{editing ? '블럭 수정' : '블럭 생성'}</span>
          <button onClick={save} className="text-brand text-sm font-bold">확인</button>
        </div>

        {/* 미리보기 — 격자에 놓일 모습 그대로 */}
        <div className="flex justify-center py-1">
          <div className="relative w-28 h-28 bg-card rounded-2xl flex flex-col items-center justify-center gap-2">
            {colorHex && <span className="absolute top-0 right-4 w-2.5 h-4 rounded-b-full" style={{ backgroundColor: colorHex }} />}
            <BlockIcon name={icon} className="w-8 h-8 text-ink" />
            <span className="text-ink text-xs font-medium truncate max-w-[80px]">{name || '작업명'}</span>
          </div>
        </div>

        <div>
          <label className="text-sub text-xs font-bold">작업명</label>
          <div className="flex items-center gap-2 bg-card rounded-xl px-3 mt-1.5">
            <input value={name} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)}
              placeholder="예: 뉴스 시청" className="flex-1 bg-transparent py-2.5 outline-none text-ink" />
            <span className="text-sub text-xs shrink-0">{name.length}/{NAME_MAX}</span>
          </div>
        </div>

        <div>
          <label className="text-sub text-xs font-bold">그룹</label>
          {addingGroup ? (
            <div className="flex items-center gap-2 mt-1.5">
              <input value={newGroup} maxLength={GROUP_MAX} autoFocus
                onChange={(e) => setNewGroup(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createGroup()}
                placeholder="예: 자기계발" className="flex-1 bg-card rounded-xl px-3 py-2 outline-none text-ink" />
              <button onClick={createGroup} className="text-brand text-sm font-bold px-2">추가</button>
              <button onClick={() => { setAddingGroup(false); setNewGroup('') }} className="text-sub text-sm px-1">취소</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1.5">
              <select value={groupId ?? ''} onChange={(e) => setGroupId(e.target.value || null)}
                className="flex-1 bg-card rounded-xl px-3 py-2 outline-none text-ink">
                <option value="">일반 블럭</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <button onClick={() => setAddingGroup(true)} className="text-brand text-sm font-bold px-2">+ 새 그룹</button>
            </div>
          )}
        </div>

        <div>
          <label className="text-sub text-xs font-bold">아이콘</label>
          <div className="grid grid-cols-6 gap-2 mt-1.5">
            {BLOCK_ICONS.map((o) => (
              <button key={o.key} onClick={() => setIcon(o.key)} title={o.label}
                className={`aspect-square rounded-xl flex items-center justify-center ${icon === o.key ? 'bg-brand/15 ring-2 ring-brand text-brand' : 'bg-card text-ink'}`}>
                <BlockIcon name={o.key} className="w-5 h-5" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sub text-sm">색상</span>
          <div className="flex gap-2 items-center">
            <button onClick={() => setColor(null)} className={`w-6 h-6 rounded-full border ${color === null ? 'border-ink' : 'border-line'} text-sub text-xs`}>×</button>
            {ARCHIVE_COLORS.map((c) => (
              <button key={c.key} onClick={() => setColor(c.key)} style={{ backgroundColor: c.hex }}
                className={`w-6 h-6 rounded-full ${color === c.key ? 'ring-2 ring-ink' : ''}`} />
            ))}
          </div>
        </div>

        {editing && <button onClick={remove} className="w-full text-danger text-sm py-1">삭제</button>}
      </div>
    </div>
  )
}
