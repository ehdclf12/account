import { useNavigate } from 'react-router-dom'
import { useTransactions } from '@/hooks/useTransactions'
import { useFundData } from '@/hooks/useBusiness'
import { computeSummary } from '@/lib/summary'
import { computeFundBalance } from '@/lib/businessFund'
import { formatKRW } from '@/lib/format'

export default function HubScreen() {
  const now = new Date()
  const { data: txs = [] } = useTransactions(now.getFullYear(), now.getMonth() + 1)
  const { data: fund } = useFundData()
  const s = computeSummary(txs)
  const balance = fund ? computeFundBalance(fund.transfers, fund.business) : 0
  const nav = useNavigate()

  return (
    <div className="p-5 space-y-5">
      <h1 className="text-xl font-bold text-ink">우리집 가계부</h1>

      <button onClick={() => nav('/household')}
        className="w-full text-left bg-card rounded-2xl p-5 active:opacity-70">
        <div className="flex justify-between items-center">
          <span className="font-bold text-ink text-lg">집</span>
          <span className="text-sub text-xl">›</span>
        </div>
        <p className="text-sub text-sm mt-3">이번 달 남은 돈</p>
        <p className="text-3xl font-bold text-ink mt-1">{formatKRW(s.remaining)}</p>
      </button>

      <button onClick={() => nav('/business')}
        className="w-full text-left bg-card rounded-2xl p-5 active:opacity-70">
        <div className="flex justify-between items-center">
          <span className="font-bold text-ink text-lg">코스모스</span>
          <span className="text-sub text-xl">›</span>
        </div>
        <p className="text-sub text-sm mt-3">사업자금 잔액</p>
        <p className={`text-3xl font-bold mt-1 ${balance < 0 ? 'text-[#F04452]' : 'text-ink'}`}>{formatKRW(balance)}</p>
      </button>
    </div>
  )
}
