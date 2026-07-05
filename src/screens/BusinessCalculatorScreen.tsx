import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { calcMargin, recommendPrice } from '@/lib/margin'
import { formatKRW } from '@/lib/format'

type Mode = 'margin' | 'price'
const pct = (r: number) => `${(r * 100).toFixed(1)}%`

export default function BusinessCalculatorScreen() {
  const nav = useNavigate()
  const [mode, setMode] = useState<Mode>('margin')

  // 공통 입력
  const [price, setPrice] = useState('')
  const [cost, setCost] = useState('')
  const [extra, setExtra] = useState('')
  const [qty, setQty] = useState('1')
  const [targetMargin, setTargetMargin] = useState('') // %

  const nPrice = Number(price) || 0
  const nCost = Number(cost) || 0
  const nExtra = Number(extra) || 0
  const nQty = Number(qty) || 0
  const nTarget = (Number(targetMargin) || 0) / 100

  const m = calcMargin(nPrice, nCost, nExtra, nQty)
  const recommended = recommendPrice(nCost, nExtra, nTarget)
  const recResult = calcMargin(recommended, nCost, nExtra, nQty)

  const num = (v: string, set: (s: string) => void, ph: string, label: string) => (
    <label className="flex justify-between items-center">
      <span className="text-sub text-sm">{label}</span>
      <span className="flex items-center gap-1">
        <input value={v} onChange={(e) => set(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder={ph}
          className="w-32 bg-card rounded-xl px-3 py-2 text-right outline-none" />
      </span>
    </label>
  )

  const Row = ({ k, val, warn }: { k: string; val: string; warn?: boolean }) => (
    <div className="flex justify-between text-sm py-1">
      <span className="text-sub">{k}</span>
      <span className={warn ? 'text-[#F04452] font-bold' : 'text-ink font-bold'}>{val}</span>
    </div>
  )

  return (
    <div className="p-5 space-y-5">
      <button onClick={() => nav('/business')} className="text-sub text-sm">‹ 코스모스</button>
      <h1 className="text-xl font-bold text-ink">원가·마진 계산</h1>

      <div className="flex bg-card rounded-2xl p-1">
        {(['margin', 'price'] as Mode[]).map((mm) => (
          <button key={mm} onClick={() => setMode(mm)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold ${mode === mm ? 'bg-white shadow text-ink' : 'text-sub'}`}>
            {mm === 'margin' ? '마진 계산' : '판매가 역산'}
          </button>
        ))}
      </div>

      {mode === 'margin' ? (
        <>
          <div className="space-y-2">
            {num(price, setPrice, '0', '판매가')}
            {num(cost, setCost, '0', '원가')}
            {num(extra, setExtra, '0', '부대비용')}
            {num(qty, setQty, '1', '수량')}
          </div>
          <div className="bg-card rounded-2xl p-4">
            <Row k="개당 총원가" val={formatKRW(m.unitCost)} />
            <Row k="개당 이익" val={formatKRW(m.unitProfit)} warn={m.unitProfit < 0} />
            <Row k="마진율" val={pct(m.marginRate)} warn={m.marginRate < 0} />
            <Row k="원가율" val={pct(m.costRate)} />
            <div className="border-t border-white my-2" />
            <Row k="총매출" val={formatKRW(m.totalRevenue)} />
            <Row k="총이익" val={formatKRW(m.totalProfit)} warn={m.totalProfit < 0} />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            {num(cost, setCost, '0', '원가')}
            {num(extra, setExtra, '0', '부대비용')}
            {num(targetMargin, setTargetMargin, '0', '목표 마진율(%)')}
            {num(qty, setQty, '1', '수량')}
          </div>
          <div className="bg-card rounded-2xl p-4">
            <Row k="권장 판매가" val={recommended > 0 ? formatKRW(recommended) : '마진율 확인'} warn={recommended === 0} />
            <Row k="개당 이익" val={formatKRW(recResult.unitProfit)} />
            <div className="border-t border-white my-2" />
            <Row k="총매출" val={formatKRW(recResult.totalRevenue)} />
            <Row k="총이익" val={formatKRW(recResult.totalProfit)} />
          </div>
        </>
      )}
    </div>
  )
}
