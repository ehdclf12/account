import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAssets } from '@/hooks/useAssets'
import { useSavingsProgress } from '@/hooks/useSavingsGoals'
import { useQuotes } from '@/hooks/useQuotes'
import { computeNetWorth } from '@/lib/networth'
import { effectiveAmount, isLivePriced } from '@/lib/quote'
import { formatKRW } from '@/lib/format'
import AssetSheet from '@/components/AssetSheet'
import type { Asset, AssetType } from '@/types'

const TYPE_LABEL: Record<AssetType, string> = {
  stock_us: '미국주식', stock_kr: '한국주식', crypto: '코인',
  real_estate: '부동산', cash: '현금', etc: '기타', liability: '부채',
}

export default function AssetsScreen() {
  const nav = useNavigate()
  const { data: assets = [] } = useAssets()
  const { data: progress = {} } = useSavingsProgress()
  const savingsTotal = Object.values(progress).reduce((a, b) => a + b, 0)

  const symbols = assets.map((a) => a.symbol).filter((s): s is string => !!s)
  const quotesQuery = useQuotes(symbols)
  const quotes = quotesQuery.data?.quotes ?? {}
  const usdkrw = quotesQuery.data?.usdkrw ?? null

  const netRows = assets.map((a) => ({ type: a.type, amount: effectiveAmount(a, quotes[a.symbol ?? ''], usdkrw) }))
  const { total } = computeNetWorth(netRows, savingsTotal)

  const [editing, setEditing] = useState<Asset | null>(null)
  const [adding, setAdding] = useState(false)

  return (
    <div className="p-5 space-y-5">
      <button onClick={() => nav('/budget')} className="text-sub text-sm">‹ 예산관리</button>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">자산 현황</h1>
        <button onClick={() => quotesQuery.refetch()} disabled={quotesQuery.isFetching} className="text-sub text-sm">
          {quotesQuery.isFetching ? '불러오는 중…' : '새로고침'}
        </button>
      </div>

      <div>
        <p className="text-sub text-sm">순자산</p>
        <p className={`text-4xl font-bold mt-1 ${total < 0 ? 'text-danger' : 'text-ink'}`}>{formatKRW(total)}</p>
      </div>

      <div className="space-y-2">
        {savingsTotal > 0 && (
          <div className="flex items-center justify-between text-sm bg-card rounded-2xl px-4 py-3">
            <span className="text-ink">저축</span>
            <span className="text-ink">{formatKRW(savingsTotal)}</span>
          </div>
        )}
        {assets.length === 0 && savingsTotal === 0 && (
          <p className="text-sub text-sm text-center py-6">등록된 자산이 없어요</p>
        )}
        {assets.map((a) => {
          const liability = a.type === 'liability'
          const quote = quotes[a.symbol ?? '']
          const eff = effectiveAmount(a, quote, usdkrw)
          const live = isLivePriced(a, quote, usdkrw)
          return (
            <button key={a.id} onClick={() => setEditing(a)}
              className="w-full flex items-center justify-between text-sm bg-card rounded-2xl px-4 py-3 active:opacity-70">
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] text-sub bg-white rounded px-1.5 py-0.5 shrink-0">{TYPE_LABEL[a.type]}</span>
                <span className="text-ink truncate">{a.name}</span>
                {live && <span className="text-[10px] text-brand bg-white rounded px-1.5 py-0.5 shrink-0">시세</span>}
              </span>
              <span className={liability ? 'text-danger shrink-0' : 'text-ink shrink-0'}>
                {liability ? '−' : ''}{formatKRW(eff)}
              </span>
            </button>
          )
        })}
      </div>

      <button onClick={() => setAdding(true)} className="w-full bg-brand text-white rounded-2xl py-3 font-bold">자산 추가</button>

      {adding && <AssetSheet open onClose={() => setAdding(false)} />}
      {editing && <AssetSheet open onClose={() => setEditing(null)} editing={editing} />}
    </div>
  )
}
