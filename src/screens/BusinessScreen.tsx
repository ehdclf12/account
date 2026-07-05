import { useState } from 'react'
import { useBusinessTransactions, useBusinessCategories, useFundData, useDeleteBusinessTx } from '@/hooks/useBusiness'
import { computeFundBalance } from '@/lib/businessFund'
import { computeSummary } from '@/lib/summary'
import { formatKRW } from '@/lib/format'
import { groupByDate } from '@/lib/grouping'
import { formatDayHeader } from '@/lib/date'
import TransactionRow from '@/components/TransactionRow'
import BusinessSheet from '@/components/BusinessSheet'
import TransferSheet from '@/components/TransferSheet'
import type { Transaction } from '@/types'

export default function BusinessScreen() {
  const now = new Date()
  const year = now.getFullYear(), month = now.getMonth() + 1
  const { data: txs = [] } = useBusinessTransactions(year, month)
  const { data: cats = [] } = useBusinessCategories()
  const { data: fund } = useFundData()
  const del = useDeleteBusinessTx()
  const catMap = new Map(cats.map((c) => [c.id, c]))
  const balance = fund ? computeFundBalance(fund.transfers, fund.business) : 0
  const s = computeSummary(txs)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [transfer, setTransfer] = useState<null | 'to_business' | 'to_household'>(null)
  const groups = groupByDate(txs)

  async function remove(id: string) {
    if (confirm('이 사업 내역을 삭제할까요?')) { await del.mutateAsync(id); setEditing(null) }
  }

  return (
    <div className="p-5 space-y-6">
      <div>
        <p className="text-sub text-sm">사업자금 잔액</p>
        <p className={`text-4xl font-bold mt-1 ${balance < 0 ? 'text-[#F04452]' : 'text-ink'}`}>{formatKRW(balance)}</p>
        {balance < 0 && <p className="text-[#F04452] text-xs mt-1">사업자금이 부족해요</p>}
      </div>

      <div className="flex gap-3">
        <button onClick={() => setTransfer('to_business')} className="flex-1 bg-card rounded-2xl py-3 font-semibold text-ink">사업자금 보내기</button>
        <button onClick={() => setTransfer('to_household')} className="flex-1 bg-card rounded-2xl py-3 font-semibold text-ink">받기</button>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 bg-card rounded-2xl p-4">
          <p className="text-sub text-xs">이번 달 수입</p>
          <p className="font-bold text-brand mt-1">{formatKRW(s.income)}</p>
        </div>
        <div className="flex-1 bg-card rounded-2xl p-4">
          <p className="text-sub text-xs">이번 달 지출</p>
          <p className="font-bold text-ink mt-1">{formatKRW(s.expense)}</p>
        </div>
      </div>

      <div>
        <p className="font-bold text-ink mb-1">{month}월 사업 내역</p>
        {groups.length === 0 && <p className="text-sub text-sm text-center py-8">사업 내역이 없어요</p>}
        {groups.map((g) => (
          <div key={g.date} className="mb-4">
            <p className="text-xs text-sub mb-1">{formatDayHeader(g.date)}</p>
            <div className="divide-y">
              {g.items.map((t) => (
                <TransactionRow key={t.id} tx={t} category={catMap.get(t.category_id ?? '')} onClick={() => setEditing(t)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 max-w-md w-14 h-14 rounded-full bg-brand text-white text-3xl shadow-lg flex items-center justify-center">+</button>

      {open && <BusinessSheet open onClose={() => setOpen(false)} />}
      {transfer && <TransferSheet open onClose={() => setTransfer(null)} direction={transfer} />}
      {editing && (
        <>
          <BusinessSheet open onClose={() => setEditing(null)} editing={editing} />
          <button onClick={() => remove(editing.id)}
            className="fixed bottom-4 inset-x-5 max-w-md mx-auto z-[60] text-[#F04452] text-sm">이 내역 삭제</button>
        </>
      )}
    </div>
  )
}
