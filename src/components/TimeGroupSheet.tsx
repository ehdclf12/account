import { useState } from 'react'
import { useBlockGroups, useAddGroup, useUpdateGroup, useDeleteGroup, useReorderGroups, useTimeBlocks } from '@/hooks/useTimeBlocks'
import { moveItem } from '@/lib/archive'
import { showToast } from '@/lib/toast'

const GROUP_MAX = 20

export default function TimeGroupSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: groups = [] } = useBlockGroups()
  const { data: blocks = [] } = useTimeBlocks()
  const add = useAddGroup(); const upd = useUpdateGroup()
  const del = useDeleteGroup(); const reorder = useReorderGroups()

  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  if (!open) return null

  const countIn = (id: string) => blocks.filter((b) => b.group_id === id).length

  async function create() {
    const n = name.trim()
    if (!n) { showToast('그룹 이름을 입력해 주세요.'); return }
    try { await add.mutateAsync({ name: n, sort_order: groups.length }); setName('') }
    catch { /* 전역 토스트 */ }
  }

  async function rename(id: string) {
    const n = editName.trim()
    if (!n) { showToast('그룹 이름을 입력해 주세요.'); return }
    try { await upd.mutateAsync({ id, name: n }); setEditingId(null) }
    catch { /* 전역 토스트 */ }
  }

  async function remove(id: string, label: string) {
    const n = countIn(id)
    const msg = n > 0
      ? `'${label}' 그룹을 삭제할까요?\n안에 있는 블럭 ${n}개는 지워지지 않고 '일반 블럭'으로 옮겨집니다.`
      : `'${label}' 그룹을 삭제할까요?`
    if (!confirm(msg)) return
    try { await del.mutateAsync(id) } catch { /* 전역 토스트 */ }
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= groups.length) return
    const next = moveItem(groups, from, to)
    reorder.mutate(next.map((g, i) => ({ id: g.id, sort_order: i })))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dim" onClick={onClose}>
      <div className="w-full max-w-md bg-surface rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <span className="font-bold text-ink">그룹 관리</span>
          <button onClick={onClose} className="text-sub text-sm font-medium">닫기</button>
        </div>

        <div className="flex items-center gap-2">
          <input value={name} maxLength={GROUP_MAX} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
            placeholder="새 그룹 이름 (예: 자기계발)"
            className="flex-1 bg-card rounded-xl px-3 py-2 outline-none text-ink" />
          <button onClick={create} className="bg-brand text-white rounded-xl px-4 py-2 text-sm font-bold shrink-0">추가</button>
        </div>

        {groups.length === 0 ? (
          <p className="text-sub text-sm text-center py-6">
            아직 그룹이 없어요.<br />그룹 없이 만든 블럭은 '일반 블럭'으로 묶입니다.
          </p>
        ) : (
          <div className="space-y-2">
            {groups.map((g, i) => (
              <div key={g.id} className="flex items-center gap-2 bg-card rounded-xl px-3 py-2">
                {editingId === g.id ? (
                  <>
                    <input value={editName} maxLength={GROUP_MAX} autoFocus
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && rename(g.id)}
                      className="flex-1 bg-surface rounded-lg px-2 py-1 outline-none text-ink" />
                    <button onClick={() => rename(g.id)} className="text-brand text-sm font-bold px-1">저장</button>
                    <button onClick={() => setEditingId(null)} className="text-sub text-sm px-1">취소</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditingId(g.id); setEditName(g.name) }}
                      className="flex-1 text-left min-w-0 active:opacity-70">
                      <span className="text-ink truncate block">{g.name}</span>
                      <span className="text-sub text-xs">블럭 {countIn(g.id)}개</span>
                    </button>
                    <button onClick={() => move(i, i - 1)} disabled={i === 0}
                      aria-label="위로" className="text-sub text-lg px-1.5 disabled:opacity-25">↑</button>
                    <button onClick={() => move(i, i + 1)} disabled={i === groups.length - 1}
                      aria-label="아래로" className="text-sub text-lg px-1.5 disabled:opacity-25">↓</button>
                    <button onClick={() => remove(g.id, g.name)}
                      aria-label="삭제" className="text-danger text-sm px-1.5">삭제</button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
