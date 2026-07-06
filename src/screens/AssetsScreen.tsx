import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAssets } from '@/hooks/useAssets'
import { useSavingsProgress } from '@/hooks/useSavingsGoals'
import { computeNetWorth } from '@/lib/networth'
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
  const { total } = computeNetWorth(assets, savingsTotal)

  const [editing, setEditing] = useState<Asset | null>(null)
  const [adding, setAdding] = useState(false)

  return (
    <div className="p-5 space-y-5">
      <button onClick={() => nav('/budget')} className="text-sub text-sm">‹ 예산관리</button>
      <h1 className="text-xl font-bold text-ink">자산 현황</h1>

      <div>
        <p className="text-sub text-sm">순자산</p>
        <p className={`text-4xl font-bold mt-1 ${total < 0 ? 'text-[#F04452]' : 'text-ink'}`}>{formatKRW(total)}</p>
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
          return (
            <button key={a.id} onClick={() => setEditing(a)}
              className="w-full flex items-center justify-between text-sm bg-card rounded-2xl px-4 py-3 active:opacity-70">
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] text-sub bg-white rounded px-1.5 py-0.5 shrink-0">{TYPE_LABEL[a.type]}</span>
                <span className="text-ink truncate">{a.name}</span>
              </span>
              <span className={liability ? 'text-[#F04452] shrink-0' : 'text-ink shrink-0'}>
                {liability ? '−' : ''}{formatKRW(a.amount)}
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
