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
    // 실패 시 입력값을 지우지 않는다(사유는 전역 토스트로 안내)
    try {
      await add.mutateAsync({ name: n, sort_order: folders.length, parent_id: null })
      setName('')
    } catch { /* 전역 토스트 */ }
  }
  async function addSub(parentId: string) {
    const n = subName.trim(); if (!n) return
    try {
      await add.mutateAsync({ name: n, sort_order: folders.length, parent_id: parentId })
      setSubName(''); setSubFor(null)
    } catch { /* 전역 토스트 */ }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dim" onClick={onClose}>
      <div className="w-full max-w-md bg-surface rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                <button onClick={() => tryDelete(top.id, top.name)} className="text-danger text-sm px-1">삭제</button>
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
                  <button onClick={() => tryDelete(c.id, c.name)} className="text-danger text-sm px-1">삭제</button>
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
