import { useState } from 'react'
import { useAddAsset, useUpdateAsset, useDeleteAsset } from '@/hooks/useAssets'
import type { Asset, AssetType } from '@/types'

const TYPE_OPTIONS: { value: AssetType; label: string }[] = [
  { value: 'stock_us', label: '미국주식' },
  { value: 'stock_kr', label: '한국주식' },
  { value: 'crypto', label: '코인' },
  { value: 'real_estate', label: '부동산' },
  { value: 'cash', label: '현금' },
  { value: 'etc', label: '기타' },
  { value: 'liability', label: '부채' },
]

export default function AssetSheet(
  { open, onClose, editing }: { open: boolean; onClose: () => void; editing?: Asset },
) {
  const add = useAddAsset(); const upd = useUpdateAsset(); const del = useDeleteAsset()

  const [name, setName] = useState(editing?.name ?? '')
  const [type, setType] = useState<AssetType>(editing?.type ?? 'stock_us')
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '')
  const [symbol, setSymbol] = useState(editing?.symbol ?? '')
  const [quantity, setQuantity] = useState(editing?.quantity != null ? String(editing.quantity) : '')

  if (!open) return null

  const isMarket = type === 'stock_us' || type === 'stock_kr' || type === 'crypto'

  async function save() {
    const amt = Number(amount) || 0
    const qty = Number(quantity) || 0
    const sym = symbol.trim()
    const hasHolding = isMarket && !!sym && qty > 0
    if (!name || (amt <= 0 && !hasHolding)) return
    const payload = {
      name, type, amount: amt,
      symbol: hasHolding ? sym : null,
      quantity: hasHolding ? qty : null,
      active: true,
    }
    if (editing) await upd.mutateAsync({ id: editing.id, ...payload })
    else await add.mutateAsync(payload)
    onClose()
  }

  async function remove() {
    if (editing && confirm('이 자산을 삭제할까요?')) { await del.mutateAsync(editing.id); onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <span className="font-bold text-ink">{editing ? '자산 수정' : '자산 추가'}</span>
          <button onClick={onClose} className="text-sub text-sm font-medium">닫기</button>
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름 (예: 삼성전자, 우리집)" className="w-full bg-card rounded-xl px-3 py-2 outline-none" />
        <select value={type} onChange={(e) => setType(e.target.value as AssetType)} className="w-full bg-card rounded-xl px-3 py-2 outline-none">
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {isMarket && (
          <div className="flex gap-2">
            <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="심볼 (예: 005930.KS, AAPL, BTC-USD)" className="flex-1 bg-card rounded-xl px-3 py-2 outline-none" />
            <input value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="수량" className="w-24 bg-card rounded-xl px-3 py-2 outline-none" />
          </div>
        )}
        <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder={isMarket ? '수동 평가액 (시세 못 받을 때, 선택)' : '평가액'} className="w-full bg-card rounded-xl px-3 py-2 outline-none" />
        <button onClick={save} className="w-full bg-brand text-white rounded-2xl py-3 font-bold">저장하기</button>
        {editing && <button onClick={remove} className="w-full text-danger text-sm py-1">삭제</button>}
      </div>
    </div>
  )
}
