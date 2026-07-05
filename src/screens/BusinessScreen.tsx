import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBusinessTransactions, useBusinessCategories, useFundData } from '@/hooks/useBusiness'
import { computeFundBalance } from '@/lib/businessFund'
import { computeSummary } from '@/lib/summary'
import { formatKRW } from '@/lib/format'
import { groupByDate } from '@/lib/grouping'
import { formatDayHeader } from '@/lib/date'
import TransactionRow from '@/components/TransactionRow'
import BudgetProgress from '@/components/BudgetProgress'
import BusinessSheet from '@/components/BusinessSheet'
import TransferSheet from '@/components/TransferSheet'
import type { Transaction } from '@/types'

export default function BusinessScreen() {
  const now = new Date()
  const year = now.getFullYear(), month = now.getMonth() + 1
  const { data: txs = [] } = useBusinessTransactions(year, month)
  const { data: cats = [] } = useBusinessCategories()
  const { data: fund } = useFundData()
  const catMap = new Map(cats.map((c) => [c.id, c]))
  const balance = fund ? computeFundBalance(fund.transfers, fund.business) : 0
  const s = computeSummary(txs)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [transfer, setTransfer] = useState<null | 'to_business' | 'to_household'>(null)
  const groups = groupByDate(txs)
  const nav = useNavigate()

  return (
    <div className="p-5 space-y-6">
      <div className="flex justify-between items-center">
        <button onClick={() => nav('/budget')} className="text-sub text-sm">‹ 예산관리</button>
        <div className="flex items-center gap-3">
          <button onClick={() => nav('/business/stats')} className="text-sub text-sm">통계</button>
          <button onClick={() => nav('/business/manage')} className="text-sub text-sm">관리</button>
        </div>
      </div>
      <div>
        <h1 className="text-xl font-bold text-ink">코스모스</h1>
        <p className="text-sub text-sm mt-3">사업자금 잔액</p>
        <p className={`text-4xl font-bold mt-1 ${balance < 0 ? 'text-[#F04452]' : 'text-ink'}`}>{formatKRW(balance)}</p>
        {balance < 0 && <p className="text-[#F04452] text-xs mt-1">사업자금이 부족해요</p>}
      </div>

      <div className="flex gap-3">
        <button onClick={() => setTransfer('to_business')} className="flex-1 bg-card rounded-2xl py-3 font-semibold text-ink">사업자금 받기</button>
        <button onClick={() => setTransfer('to_household')} className="flex-1 bg-card rounded-2xl py-3 font-semibold text-ink">생활비로 사용</button>
      </div>

      <button onClick={() => nav('/business/calculator')}
        className="w-full bg-card rounded-2xl py-3 font-semibold text-ink flex justify-between items-center px-4">
        <span>원가·마진 계산</span><span className="text-sub">›</span>
      </button>

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

      <BudgetProgress month={`${year}-${String(month).padStart(2, '0')}`} categories={cats} monthTxs={txs} editTo="/business/budget" />

      <button onClick={() => nav('/business/fixed')}
        className="w-full bg-card rounded-2xl py-3 font-semibold text-ink flex justify-between items-center px-4">
        <span>고정비 관리</span><span className="text-sub">›</span>
      </button>

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
        className="fixed bottom-6 right-[max(1.25rem,calc(50%_-_13rem))] w-14 h-14 rounded-full bg-brand text-white text-3xl shadow-lg flex items-center justify-center">+</button>

      {open && <BusinessSheet open onClose={() => setOpen(false)} />}
      {transfer && <TransferSheet open onClose={() => setTransfer(null)} direction={transfer} />}
      {editing && <BusinessSheet open onClose={() => setEditing(null)} editing={editing} />}
    </div>
  )
}
