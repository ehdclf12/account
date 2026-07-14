import { useState } from 'react'
import { useBusinessCategories, useAddBusinessTx, useUpdateBusinessTx, useDeleteBusinessTx } from '@/hooks/useBusiness'
import { useIdentity } from '@/App'
import { formatKRW } from '@/lib/format'
import type { Transaction, TxType } from '@/types'

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function BusinessSheet(
  { open, onClose, editing }: { open: boolean; onClose: () => void; editing?: Transaction },
) {
  const who = useIdentity()
  const { data: cats = [] } = useBusinessCategories()
  const add = useAddBusinessTx()
  const update = useUpdateBusinessTx()
  const del = useDeleteBusinessTx()

  const [type, setType] = useState<TxType>(editing?.type ?? 'expense')
  const [amount, setAmount] = useState<string>(editing ? String(editing.amount) : '')
  const [categoryId, setCategoryId] = useState<string | null>(editing?.category_id ?? null)
  const [date, setDate] = useState(editing?.date ?? today())
  const [memo, setMemo] = useState(editing?.memo ?? '')

  if (!open) return null
  const amt = Number(amount) || 0
  const visibleCats = cats.filter((c) => c.type === type)

  async function save() {
    if (amt <= 0 || !categoryId) return
    const payload = { who, type, amount: amt, category_id: categoryId, payment_method_id: null, date, memo, scope: 'business' as const }
    if (editing) await update.mutateAsync({ id: editing.id, ...payload })
    else await add.mutateAsync(payload)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dim" onClick={onClose}>
      <div className="w-full max-w-md bg-surface rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <span className="font-bold text-ink">{editing ? '사업 내역 수정' : '사업 입력'}</span>
          <button onClick={onClose} className="text-sub text-sm font-medium">닫기</button>
        </div>
        <div className="text-center text-3xl font-bold py-2 text-ink">{formatKRW(amt)}</div>
        <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric" placeholder="금액 입력"
          className="w-full text-center border-b border-line py-2 outline-none" autoFocus />
        <div className="flex bg-card rounded-2xl p-1">
          {(['expense', 'income'] as TxType[]).map((t) => (
            <button key={t} onClick={() => { setType(t); setCategoryId(null) }}
              className={`flex-1 py-2 rounded-xl text-sm font-bold ${type === t ? 'bg-surface shadow text-ink' : 'text-sub'}`}>
              {t === 'expense' ? '지출' : '수입'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {visibleCats.map((c) => (
            <button key={c.id} onClick={() => setCategoryId(c.id)}
              className={`px-3 py-2 rounded-full text-sm font-medium ${categoryId === c.id ? 'bg-brand text-white' : 'bg-card text-ink'}`}>
              {c.name}
            </button>
          ))}
          {visibleCats.length === 0 && <span className="text-sub text-sm py-2">설정에서 사업 카테고리를 추가하세요</span>}
        </div>
        <div className="space-y-2 text-sm">
          <label className="flex justify-between items-center">
            <span className="text-sub">날짜</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-right outline-none text-ink" />
          </label>
          <label className="flex justify-between items-center">
            <span className="text-sub">메모</span>
            <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모" className="text-right outline-none text-ink" />
          </label>
        </div>
        <button onClick={save} disabled={amt <= 0 || !categoryId}
          className="w-full bg-brand disabled:bg-sub text-white rounded-2xl py-3 font-bold">저장하기</button>
        {editing && (
          <button onClick={async () => { if (confirm('이 내역을 삭제할까요?')) { await del.mutateAsync(editing.id); onClose() } }}
            className="w-full text-danger text-sm py-1">삭제</button>
        )}
      </div>
    </div>
  )
}
