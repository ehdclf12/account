import { useState } from 'react'
import { useFundTransfer, useTransferCategoryId } from '@/hooks/useBusiness'
import { useIdentity } from '@/App'
import { formatKRW } from '@/lib/format'

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function TransferSheet(
  { open, onClose, direction }: { open: boolean; onClose: () => void; direction: 'to_business' | 'to_household' },
) {
  const who = useIdentity()
  const transfer = useFundTransfer()
  const { data: transferCatId } = useTransferCategoryId()
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today())
  const [memo, setMemo] = useState('')

  if (!open) return null
  const amt = Number(amount) || 0
  const title = direction === 'to_business' ? '사업자금 받기' : '생활비로 사용'

  async function save() {
    if (amt <= 0 || !transferCatId) return
    try {
      await transfer.mutateAsync({ direction, amount: amt, date, memo, who, transferCategoryId: transferCatId })
      onClose()
    } catch { /* 실패 시 시트를 열어둔다(사유는 전역 토스트로 안내) */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dim" onClick={onClose}>
      <div className="w-full max-w-md bg-surface rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <span className="font-bold text-ink">{title}</span>
          <button onClick={onClose} className="text-sub text-sm font-medium">닫기</button>
        </div>
        <p className="text-sub text-xs">
          {direction === 'to_business' ? '가계(월급)에서 코스모스로 자금이 들어옵니다. 가계 지출로 기록돼요.' : '코스모스 자금을 생활비로 사용합니다. 가계 수입으로 기록돼요.'}
        </p>
        <div className="text-center text-3xl font-bold py-2 text-ink">{formatKRW(amt)}</div>
        <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric" placeholder="금액 입력"
          className="w-full text-center border-b border-line py-2 outline-none" autoFocus />
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
        <button onClick={save} disabled={amt <= 0 || !transferCatId}
          className="w-full bg-brand disabled:bg-sub text-white rounded-2xl py-3 font-bold">{title}</button>
      </div>
    </div>
  )
}
