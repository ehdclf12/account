import { useState } from 'react'
import { useFolders, useAddItem, useUpdateItem, useDeleteItem, fetchLinkPreview, uploadArchiveImage } from '@/hooks/useArchive'
import { normalizeUrl, buildFolderTree, ARCHIVE_COLORS } from '@/lib/archive'
import type { ArchiveColor, ArchiveItem, ArchiveKind, ChecklistEntry, LinkPreview } from '@/types'

const KIND_OPTIONS: { value: ArchiveKind; label: string }[] = [
  { value: 'checklist', label: '체크리스트' },
  { value: 'link', label: '링크' },
  { value: 'image', label: '사진' },
]

export default function ArchiveItemSheet(
  { open, onClose, editing, defaultFolderId, defaultDueDate }:
  { open: boolean; onClose: () => void; editing?: ArchiveItem; defaultFolderId?: string | null; defaultDueDate?: string },
) {
  const { data: folders = [] } = useFolders()
  const add = useAddItem(); const upd = useUpdateItem(); const del = useDeleteItem()

  const [kind, setKind] = useState<ArchiveKind>(editing?.kind ?? 'checklist')
  const [folderId, setFolderId] = useState<string | null>(editing?.folder_id ?? defaultFolderId ?? null)
  const [title, setTitle] = useState(editing?.title ?? '')
  const [url, setUrl] = useState(editing?.url ?? '')
  const [preview, setPreview] = useState<LinkPreview | null>(editing?.preview ?? null)
  const [checklist, setChecklist] = useState<ChecklistEntry[]>(editing?.checklist ?? [{ text: '', done: false }])
  const [imageUrl, setImageUrl] = useState<string>(editing?.kind === 'image' ? (editing.url ?? '') : '')
  const [loadingPrev, setLoadingPrev] = useState(false)
  const [uploading, setUploading] = useState(false)
  // 공통 메타
  const [pinned, setPinned] = useState(editing?.pinned ?? false)
  const [dueDate, setDueDate] = useState(editing?.due_date ?? defaultDueDate ?? '')
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

  const meta = { pinned, due_date: kind === 'checklist' ? (dueDate || null) : null, color, archived }

  async function save() {
    if (!folderId) { alert('폴더를 선택해 주세요.'); return }
    let payload: Omit<ArchiveItem, 'id' | 'created_at' | 'updated_at'>
    if (kind === 'link') {
      const norm = normalizeUrl(url); if (!norm) return
      payload = { folder_id: folderId, kind, title: title.trim() || preview?.title || norm, body: null, url: norm, preview, checklist: null, ...meta }
    } else if (kind === 'image') {
      if (!imageUrl) { alert('사진을 선택해 주세요.'); return }
      payload = { folder_id: folderId, kind, title: title.trim(), body: null, url: imageUrl, preview: null, checklist: null, ...meta }
    } else {
      // 체크리스트: 기한 필수 (캘린더에 뜨는 유일한 종류라서다)
      if (!dueDate) { alert('기한을 선택해 주세요.'); return }
      const cleaned = checklist.filter((c) => c.text.trim()).map((c) => ({ text: c.text.trim(), done: c.done }))
      if (!title.trim() && cleaned.length === 0) return
      payload = { folder_id: folderId, kind, title: title.trim(), body: null, url: null, preview: null, checklist: cleaned, ...meta }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dim" onClick={onClose}>
      <div className="w-full max-w-md bg-surface rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <span className="font-bold text-ink">{editing ? '항목 수정' : '항목 추가'}</span>
          <button onClick={onClose} className="text-sub text-sm font-medium">닫기</button>
        </div>

        {!editing && (
          <div className="grid grid-cols-3 gap-2">
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
        ) : (
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
        )}

        {/* 공통 메타: 핀 / 기한(체크리스트 전용) / 색상 / 보관 */}
        <div className="border-t border-line pt-3 space-y-3">
          {kind === 'checklist' && (
            <div className="flex items-center justify-between">
              <span className="text-sub text-sm">기한</span>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="bg-card rounded-xl px-3 py-2 outline-none text-sm" />
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sub text-sm">색상</span>
            <div className="flex gap-2 items-center">
              <button onClick={() => setColor(null)} className={`w-6 h-6 rounded-full border ${color === null ? 'border-ink' : 'border-line'} text-sub text-xs`}>×</button>
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
        {editing && <button onClick={remove} className="w-full text-danger text-sm py-1">삭제</button>}
      </div>
    </div>
  )
}
