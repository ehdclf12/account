import { useState } from 'react'
import { useTransactions, useDeleteTransaction } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { groupByDate } from '@/lib/grouping'
import { formatDayHeader } from '@/lib/date'
import { computeSummary } from '@/lib/summary'
import { formatKRW } from '@/lib/format'
import TransactionRow from '@/components/TransactionRow'
import TransactionSheet from '@/components/TransactionSheet'
import type { Transaction } from '@/types'

export default function LedgerScreen() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const { data: txs = [] } = useTransactions(year, month)
  const { data: cats = [] } = useCategories()
  const del = useDeleteTransaction()
  const catMap = new Map(cats.map((c) => [c.id, c]))
  const [editing, setEditing] = useState<Transaction | null>(null)

  const s = computeSummary(txs)
  const groups = groupByDate(txs)

  function move(delta: number) {
    let m = month + delta, y = year
    if (m < 1) { m = 12; y-- } else if (m > 12) { m = 1; y++ }
    setYear(y); setMonth(m)
  }

  async function remove(id: string) {
    if (confirm('이 내역을 삭제할까요?')) { await del.mutateAsync(id); setEditing(null) }
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-center gap-6 mb-2">
        <button onClick={() => move(-1)} className="text-2xl text-sub">‹</button>
        <span className="font-bold">{year}년 {month}월</span>
        <button onClick={() => move(1)} className="text-2xl text-sub">›</button>
      </div>
      <p className="text-center text-sm text-sub mb-4">
        지출 {formatKRW(s.expense)} · 수입 {formatKRW(s.income)}
      </p>

      {groups.length === 0 && <p className="text-sub text-sm text-center py-10">내역이 없어요</p>}

      {groups.map((g) => (
        <div key={g.date} className="mb-4">
          <p className="text-xs text-sub mb-1">{formatDayHeader(g.date)}</p>
          <div className="divide-y">
            {g.items.map((t) => (
              <TransactionRow key={t.id} tx={t} category={catMap.get(t.category_id ?? '')}
                onClick={() => setEditing(t)} />
            ))}
          </div>
        </div>
      ))}

      {editing && (
        <>
          <TransactionSheet open onClose={() => setEditing(null)} editing={editing} />
          <button onClick={() => remove(editing.id)}
            className="fixed bottom-4 inset-x-5 max-w-md mx-auto z-[60] text-red-500 text-sm">
            이 내역 삭제
          </button>
        </>
      )}
    </div>
  )
}
