import { useState } from 'react'
import { getExercise } from '@/data/workout/exercises'
import { e1rm, performances } from '@/engine/workout/prescribe'
import { RECOVERY_EXERCISE_ID } from '@/engine/workout/constants'
import type { WorkoutLog } from '@/engine/workout/types'
import { fmtKg, formatDate } from './format'

/** 체크된 세트가 있는 종목 id, 가장 최근 수행일 순. 루틴에서 빠진 종목도 남는다. */
export function exercisesWithHistory(logs: WorkoutLog[]): { id: string; last: string }[] {
  const last = new Map<string, string>()
  for (const l of logs) for (const s of l.sets) {
    if (!s.done || s.exerciseId === RECOVERY_EXERCISE_ID) continue
    const prev = last.get(s.exerciseId)
    if (!prev || l.date > prev) last.set(s.exerciseId, l.date)
  }
  return [...last].map(([id, d]) => ({ id, last: d }))
    .sort((a, b) => b.last.localeCompare(a.last) || a.id.localeCompare(b.id))
}

const nameOf = (id: string) => getExercise(id)?.nameKo ?? id

export default function HistoryTab({ logs }: { logs: WorkoutLog[] }) {
  const [sel, setSel] = useState<string | null>(null)
  const list = exercisesWithHistory(logs)

  if (sel) {
    const perf = performances(logs, sel)
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setSel(null)} className="min-h-[44px] px-3 rounded-xl bg-card text-ink text-sm font-medium active:opacity-70">‹ 목록</button>
          <p className="text-ink font-bold truncate">{nameOf(sel)}</p>
        </div>
        <ul className="space-y-2">
          {perf.map((p) => {
            const best = p.sets.reduce<number | null>((m, s) => (s.weightKg === null ? m : Math.max(m ?? 0, e1rm(s.weightKg, s.reps))), null)
            return (
              <li key={p.date} className="bg-card rounded-2xl px-4 py-3">
                <div className="flex justify-between items-baseline gap-2">
                  <span className="text-ink font-medium">{formatDate(p.date)}</span>
                  <span className="text-sub text-xs shrink-0">추정 1RM <span className="text-ink font-bold">{best === null ? '—' : `${best.toFixed(1)}kg`}</span></span>
                </div>
                <p className="text-sub text-sm mt-1">
                  {p.sets.map((s) => `${s.weightKg === null ? '맨몸' : fmtKg(s.weightKg)}×${s.reps}`).join(' · ')}
                </p>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  if (list.length === 0) {
    return <div className="bg-card rounded-2xl p-6 text-center text-sub text-sm">아직 기록이 없어요. 오늘 탭에서 세트를 체크하면 여기에 쌓여요.</div>
  }

  return (
    <ul className="space-y-2">
      {list.map((x) => (
        <li key={x.id}>
          <button onClick={() => setSel(x.id)}
            className="w-full min-h-[52px] bg-card rounded-2xl px-4 flex items-center justify-between gap-2 text-left active:opacity-70">
            <span className="text-ink font-medium truncate">{nameOf(x.id)}</span>
            <span className="text-sub text-xs shrink-0">{formatDate(x.last)} ›</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
