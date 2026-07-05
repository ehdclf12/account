import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { computeSummary } from '@/lib/summary'
import { formatKRW } from '@/lib/format'
import TransactionSheet from '@/components/TransactionSheet'
import TransactionRow from '@/components/TransactionRow'
import BudgetProgress from '@/components/BudgetProgress'

export default function HomeScreen() {
  const now = new Date()
  const year = now.getFullYear(), month = now.getMonth() + 1
  const { data: txs = [] } = useTransactions(year, month)
  const { data: cats = [] } = useCategories()
  const catMap = new Map(cats.map((c) => [c.id, c]))
  const s = computeSummary(txs)
  const [open, setOpen] = useState(false)
  const nav = useNavigate()

  return (
    <div className="p-5 space-y-6">
      <div className="flex justify-between items-center">
        <button onClick={() => nav('/budget')} className="text-sub text-sm">‹ 예산관리</button>
        <div className="flex items-center gap-3">
          <button onClick={() => nav('/household/stats')} className="text-sub text-sm">통계</button>
          <button onClick={() => nav('/household/manage')} className="text-sub text-sm">관리</button>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-lg font-bold">집 · {year}년 {month}월</span>
      </div>

      <div>
        <p className="text-sub text-sm">이번 달 남은 돈</p>
        <p className="text-4xl font-bold mt-1">{formatKRW(s.remaining)}</p>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 bg-card rounded-2xl p-4">
          <p className="text-sub text-xs">수입</p>
          <p className="font-bold text-brand mt-1">{formatKRW(s.income)}</p>
        </div>
        <div className="flex-1 bg-card rounded-2xl p-4">
          <p className="text-sub text-xs">지출</p>
          <p className="font-bold text-ink mt-1">{formatKRW(s.expense)}</p>
        </div>
      </div>

      <BudgetProgress month={`${year}-${String(month).padStart(2, '0')}`} categories={cats} monthTxs={txs} editTo="/household/budget" />

      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="font-bold">최근 내역</span>
          <Link to="/ledger" className="text-sub text-sm">전체보기 ›</Link>
        </div>
        {txs.length === 0
          ? <p className="text-sub text-sm py-6 text-center">아직 내역이 없어요</p>
          : <div className="divide-y">
              {txs.slice(0, 5).map((t) => (
                <TransactionRow key={t.id} tx={t} category={catMap.get(t.category_id ?? '')} />
              ))}
            </div>}
      </div>

      <button onClick={() => setOpen(true)}
        className="fixed bottom-6 right-5 max-w-md w-14 h-14 rounded-full bg-brand text-white text-3xl shadow-lg flex items-center justify-center">
        +
      </button>
      {open && <TransactionSheet open onClose={() => setOpen(false)} />}
    </div>
  )
}
