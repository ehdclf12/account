import { useState } from 'react'
import { useSavingsGoals, useSavingsProgress } from '@/hooks/useSavingsGoals'
import { goalProgress, monthlyNeeded } from '@/lib/savings'
import { formatKRW } from '@/lib/format'
import SavingsGoalSheet from '@/components/SavingsGoalSheet'
import NavButton from '@/components/NavButton'
import type { SavingsGoal } from '@/types'

export default function SavingsManageScreen() {
  const { data: goals = [] } = useSavingsGoals()
  const { data: progress = {} } = useSavingsProgress()
  const [editing, setEditing] = useState<SavingsGoal | null>(null)
  const [adding, setAdding] = useState(false)

  const now = new Date()
  const nowRef = { year: now.getFullYear(), month: now.getMonth() + 1 }

  function deadlineLabel(g: SavingsGoal): string {
    if (g.target_year == null) return ''
    return g.target_quarter ? `${g.target_year}년 ${g.target_quarter}분기까지` : `${g.target_year}년까지`
  }

  return (
    <div className="p-5 space-y-5">
      <NavButton to="/household" label="Household" />
      <h1 className="text-xl font-bold text-ink">저축 목표</h1>

      <div className="space-y-3">
        {goals.length === 0 && <p className="text-sub text-sm text-center py-6">등록된 저축 목표가 없어요</p>}
        {goals.map((g) => {
          const current = progress[g.id] ?? 0
          const { pct, remaining } = goalProgress(g.target_amount, current)
          const monthly = monthlyNeeded(remaining, g.target_year, g.target_quarter, nowRef)
          return (
            <button key={g.id} onClick={() => setEditing(g)}
              className="w-full text-left bg-card rounded-2xl p-4 active:opacity-70">
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-ink">{g.name}</span>
                <span className="text-sub text-sm">{pct}%</span>
              </div>
              <div className="h-2 bg-surface rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-ink">{formatKRW(current)} / {formatKRW(g.target_amount)}</span>
                <span className="text-sub">{remaining > 0 ? `${formatKRW(remaining)} 남음` : '달성!'}</span>
              </div>
              {(deadlineLabel(g) || monthly) && (
                <p className="text-sub text-xs mt-1">
                  {monthly ? `월 약 ${formatKRW(monthly)}씩` : ''}{monthly && deadlineLabel(g) ? ' · ' : ''}{deadlineLabel(g)}
                </p>
              )}
            </button>
          )
        })}
      </div>

      <button onClick={() => setAdding(true)} className="w-full bg-brand text-white rounded-2xl py-3 font-bold">저축 목표 추가</button>

      {adding && <SavingsGoalSheet open onClose={() => setAdding(false)} />}
      {editing && <SavingsGoalSheet open onClose={() => setEditing(null)} editing={editing} />}
    </div>
  )
}
