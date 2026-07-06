import { useNavigate } from 'react-router-dom'
import { useTransactions } from '@/hooks/useTransactions'
import { useFundData } from '@/hooks/useBusiness'
import { computeSummary } from '@/lib/summary'
import { computeFundBalance } from '@/lib/businessFund'
import { formatKRW } from '@/lib/format'
import { useAssets } from '@/hooks/useAssets'
import { useSavingsProgress } from '@/hooks/useSavingsGoals'
import { computeNetWorth } from '@/lib/networth'

export default function HubScreen() {
  const now = new Date()
  const { data: txs = [] } = useTransactions(now.getFullYear(), now.getMonth() + 1)
  const { data: fund } = useFundData()
  const s = computeSummary(txs)
  const balance = fund ? computeFundBalance(fund.transfers, fund.business) : 0
  const nav = useNavigate()
  const { data: assets = [] } = useAssets()
  const { data: progress = {} } = useSavingsProgress()
  const savingsTotal = Object.values(progress).reduce((a, b) => a + b, 0)
  const netWorth = computeNetWorth(assets, savingsTotal).total

  return (
    <div className="p-5 space-y-5">
      <button onClick={() => nav('/')} className="text-sub text-sm">‹ 홈</button>
      <h1 className="text-xl font-bold text-ink">예산관리</h1>

      <button onClick={() => nav('/assets')}
        className="w-full text-left bg-card rounded-2xl p-5 active:opacity-70">
        <div className="flex justify-between items-center">
          <span className="font-bold text-ink text-lg">자산현황</span>
          <span className="text-sub text-xl">›</span>
        </div>
        <p className="text-sub text-sm mt-3">순자산</p>
        <p className={`text-3xl font-bold mt-1 ${netWorth < 0 ? 'text-[#F04452]' : 'text-ink'}`}>{formatKRW(netWorth)}</p>
      </button>

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
