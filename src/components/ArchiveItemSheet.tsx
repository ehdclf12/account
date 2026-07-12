import { useState } from 'react'
import { useFolders, useAddItem, useUpdateItem, useDeleteItem, fetchLinkPreview } from '@/hooks/useArchive'
import { normalizeUrl } from '@/lib/archive'
import type { ArchiveItem, ArchiveKind, ChecklistEntry, LinkPreview } from '@/types'

const KIND_OPTIONS: { value: ArchiveKind; label: string }[] = [
  { value: 'memo', label: '메모' },
  { value: 'checklist', label: '체크리스트' },
  { value: 'link', label: '링크' },
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
  const [loadingPrev, setLoadingPrev] = useState(false)

  if (!open) return null

  async function loadPreview() {
    const norm = normalizeUrl(url)
    if (!norm) return
    setUrl(norm)
    setLoadingPrev(true)
    const p = await fetchLinkPreview(norm)
    setLoadingPrev(false)
    if (p) { setPreview(p); if (!title) setTitle(p.title) }
  }

  function setCheckText(i: number, text: string) {
    setChecklist((cs) => cs.map((c, idx) => idx === i ? { ...c, text } : c))
  }
  function addCheckRow() { setChecklist((cs) => [...cs, { text: '', done: false }]) }
  function removeCheckRow(i: number) { setChecklist((cs) => cs.filter((_, idx) => idx !== i)) }

  async function save() {
    if (kind === 'link') {
      const norm = normalizeUrl(url)
      if (!norm) return
      const payload = {
        folder_id: folderId, kind, title: title.trim() || preview?.title || norm,
        body: null, url: norm, preview, checklist: null,
      }
      if (editing) await upd.mutateAsync({ id: editing.id, ...payload })
      else await add.mutateAsync(payload)
    } else if (kind === 'checklist') {
      const cleaned = checklist.filter((c) => c.text.trim()).map((c) => ({ text: c.text.trim(), done: c.done }))
      if (!title.trim() && cleaned.length === 0) return
      const payload = {
        folder_id: folderId, kind, title: title.trim(),
        body: null, url: null, preview: null, checklist: cleaned,
      }
      if (editing) await upd.mutateAsync({ id: editing.id, ...payload })
      else await add.mutateAsync(payload)
    } else {
      if (!title.trim() && !body.trim()) return
      const payload = {
        folder_id: folderId, kind, title: title.trim(),
        body: body.trim() || null, url: null, preview: null, checklist: null,
      }
      if (editing) await upd.mutateAsync({ id: editing.id, ...payload })
      else await add.mutateAsync(payload)
    }
    onClose()
  }

  async function remove() {
    if (editing && confirm('이 항목을 삭제할까요?')) { await del.mutateAsync(editing.id); onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <span className="font-bold text-ink">{editing ? '항목 수정' : '항목 추가'}</span>
          <button onClick={onClose} className="text-sub text-sm font-medium">닫기</button>
        </div>

        {!editing && (
          <div className="flex gap-2">
            {KIND_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => setKind(o.value)}
                className={`flex-1 rounded-xl py-2 text-sm font-medium ${kind === o.value ? 'bg-brand text-white' : 'bg-card text-sub'}`}>
                {o.label}
              </button>
            ))}
          </div>
        )}

        <select value={folderId ?? ''} onChange={(e) => setFolderId(e.target.value || null)} className="w-full bg-card rounded-xl px-3 py-2 outline-none">
          <option value="">미분류</option>
          {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>

        {kind === 'link' ? (
          <>
            <div className="flex gap-2">
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="flex-1 bg-card rounded-xl px-3 py-2 outline-none" />
              <button onClick={loadPreview} disabled={loadingPrev} className="bg-brand text-white rounded-xl px-3 text-sm font-bold">
                {loadingPrev ? '…' : '미리보기'}
              </button>
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

        <button onClick={save} className="w-full bg-brand text-white rounded-2xl py-3 font-bold">저장하기</button>
        {editing && <button onClick={remove} className="w-full text-[#F04452] text-sm py-1">삭제</button>}
      </div>
    </div>
  )
}
