import { useNavigate } from 'react-router-dom'
import { useCategories } from '@/hooks/useCategories'
import { useBusinessCategories } from '@/hooks/useBusiness'
import { useRangeTransactions } from '@/hooks/useStatsData'
import { recentMonths, monthlyExpense, categoryBreakdown } from '@/lib/stats'
import { nextMonthFirst } from '@/lib/date'
import { formatKRW } from '@/lib/format'
import Donut, { CAT_COLORS, ETC_COLOR } from '@/components/Donut'
import type { Category } from '@/types'

export default function StatsScreen({ scope, backTo }: { scope: 'household' | 'business'; backTo: string }) {
  const nav = useNavigate()
  const now = new Date()
  const year = now.getFullYear(), month = now.getMonth() + 1
  const months = recentMonths(year, month, 6)
  const fromDate = `${months[0].key}-01`
  const toExclusive = nextMonthFirst(year, month)

  const household = useCategories()
  const business = useBusinessCategories()
  const cats: Category[] = (scope === 'business' ? business.data : household.data) ?? []
  const catName = new Map(cats.map((c) => [c.id, c.name]))

  const { data: txs = [] } = useRangeTransactions(scope, fromDate, toExclusive)

  const totals = monthlyExpense(txs, months.map((m) => m.key))
  const max = Math.max(1, ...totals)
  const cur = totals[totals.length - 1]
  const prev = totals[totals.length - 2] ?? 0
  const delta = prev > 0 ? (cur - prev) / prev : 0

  const breakdown = categoryBreakdown(txs, months[months.length - 1].key)
  const top = breakdown.slice(0, 7)
  const etc = breakdown.slice(7).reduce((a, s) => a + s.amount, 0)
  const etcPct = breakdown.slice(7).reduce((a, s) => a + s.pct, 0)
  const slices = [
    ...top.map((s, i) => ({ color: CAT_COLORS[i], pct: s.pct })),
    ...(etc > 0 ? [{ color: ETC_COLOR, pct: etcPct }] : []),
  ]

  return (
    <div className="p-5 space-y-6">
      <button onClick={() => nav(backTo)} className="text-sub text-sm">‹ 뒤로</button>
      <h1 className="text-xl font-bold text-ink">통계</h1>

      {/* 지난달 대비 */}
      <div className="bg-card rounded-2xl p-4">
        <p className="text-sub text-sm">이번 달 지출</p>
        <p className="text-3xl font-bold text-ink mt-1">{formatKRW(cur)}</p>
        {prev > 0 && (
          <p className={`text-sm mt-1 ${delta > 0 ? 'text-danger' : 'text-positive'}`}>
            지난달 대비 {delta > 0 ? '↑' : '↓'} {Math.abs(Math.round(delta * 100))}%
          </p>
        )}
      </div>

      {/* 월별 추이 */}
      <div>
        <p className="font-bold text-ink mb-3">월별 지출 추이</p>
        <div className="flex items-end gap-2 h-32">
          {months.map((mm, i) => (
            <div key={mm.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div className="w-full bg-brand rounded-md" style={{ height: `${Math.round((totals[i] / max) * 100)}%`, minHeight: totals[i] > 0 ? '4px' : '0' }} />
              <span className="text-xs text-sub">{mm.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 카테고리별 (이번 달) */}
      <div>
        <p className="font-bold text-ink mb-3">카테고리별 지출 (이번 달)</p>
        {breakdown.length === 0 ? (
          <p className="text-sub text-sm">지출 내역이 없어요</p>
        ) : (
          <div className="flex items-center gap-4">
            <Donut slices={slices} />
            <div className="flex-1 space-y-2">
              {top.map((s, i) => (
                <div key={s.category_id} className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: CAT_COLORS[i] }} />
                  <span className="text-ink flex-1 truncate">{catName.get(s.category_id) ?? '기타'}</span>
                  <span className="text-sub">{Math.round(s.pct * 100)}%</span>
                </div>
              ))}
              {etc > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: ETC_COLOR }} />
                  <span className="text-ink flex-1">기타</span>
                  <span className="text-sub">{Math.round(etcPct * 100)}%</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
