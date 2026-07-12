import { useState } from 'react'
import { useFolders, useAddFolder, useUpdateFolder, useDeleteFolder } from '@/hooks/useArchive'

export default function FolderSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: folders = [] } = useFolders()
  const add = useAddFolder(); const upd = useUpdateFolder(); const del = useDeleteFolder()
  const [name, setName] = useState('')

  if (!open) return null

  async function create() {
    const n = name.trim()
    if (!n) return
    await add.mutateAsync({ name: n, sort_order: folders.length })
    setName('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <span className="font-bold text-ink">폴더 관리</span>
          <button onClick={onClose} className="text-sub text-sm font-medium">닫기</button>
        </div>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="새 폴더 이름" className="flex-1 bg-card rounded-xl px-3 py-2 outline-none" />
          <button onClick={create} className="bg-brand text-white rounded-xl px-4 font-bold">추가</button>
        </div>
        <div className="space-y-2">
          {folders.map((f) => (
            <div key={f.id} className="flex items-center gap-2">
              <input
                defaultValue={f.name}
                onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== f.name) upd.mutate({ id: f.id, name: v }) }}
                className="flex-1 bg-card rounded-xl px-3 py-2 outline-none" />
              <button
                onClick={() => { if (confirm(`'${f.name}' 폴더를 삭제할까요? 항목은 미분류로 이동해요.`)) del.mutate(f.id) }}
                className="text-[#F04452] text-sm px-2">삭제</button>
            </div>
          ))}
          {folders.length === 0 && <p className="text-sub text-sm text-center py-4">폴더가 없어요</p>}
        </div>
      </div>
    </div>
  )
}
