import { useState } from 'react'
import { useSaveLog } from '@/hooks/useWorkout'
import { findSession, sessionStatus, todaySession, upsertSet, RECOVERY_EXERCISE_ID } from '@/engine/workout/today'
import { RECOVERY_REASON } from '@/engine/workout/constants'
import type { Program, Slot, WorkoutLog } from '@/engine/workout/types'
import ExerciseCard from './ExerciseCard'
import type { SaveSet } from './ExerciseCard'
import Sheet from './Sheet'
import { useLatestLog } from './latestLog'
import { STATUS_LABEL } from './format'

/** 슬롯 순서대로 묶는다. 슈퍼세트 짝은 처음 나온 자리에 한 묶음으로. */
export function groupSlots(slots: Slot[]): Slot[][] {
  const out: Slot[][] = []
  const seen = new Map<string, Slot[]>()
  for (const s of slots) {
    if (!s.superset) { out.push([s]); continue }
    const g = seen.get(s.superset)
    if (g) g.push(s)
    else { const n = [s]; seen.set(s.superset, n); out.push(n) }
  }
  return out
}

export default function TodayTab({ program, logs, today }: { program: Program; logs: WorkoutLog[]; today: string }) {
  const save = useSaveLog()
  const latest = useLatestLog(logs, today)
  const [picking, setPicking] = useState(false)

  const sessionId = todaySession(program, logs, today)
  const session = findSession(program, sessionId)
  const todayLog = logs.find((l) => l.date === today)

  const saveSet: SaveSet = (exerciseId, setIndex, weightKg, reps, done) => {
    if (!sessionId) return
    save.mutate(upsertSet(latest(), today, sessionId, { exerciseId, setIndex, weightKg, reps, done }))
  }

  function changeToday(id: string) {
    const cur = latest()
    save.mutate(cur ? { ...cur, sessionId: id } : { date: today, sessionId: id, sets: [] })
    setPicking(false)
  }

  const changeButton = (
    <button onClick={() => setPicking(true)}
      className="w-full min-h-[44px] rounded-2xl bg-card text-ink text-sm font-medium active:opacity-70">
      오늘만 바꾸기
    </button>
  )

  let body
  if (!sessionId) {
    body = (
      <div className="bg-card rounded-2xl p-6 text-center">
        <p className="text-ink font-bold text-lg">오늘은 쉬는 날</p>
        <p className="text-sub text-sm mt-1">푹 쉬고 다음 운동에서 만나요</p>
      </div>
    )
  } else if (!session) {
    body = (
      <div className="bg-card rounded-2xl p-6 text-center text-sub text-sm">
        오늘 기록의 세션이 지금 루틴에 없어요. 오늘만 바꾸기로 다시 골라 주세요.
      </div>
    )
  } else if (session.kind === 'recovery') {
    const done = sessionStatus(todayLog, session) === 'done'
    body = (
      <div className="bg-card rounded-2xl p-5 space-y-4">
        <div>
          <p className="text-ink font-bold text-lg">{session.name}</p>
          <p className="text-sub text-sm mt-1">{RECOVERY_REASON}</p>
        </div>
        <button role="checkbox" aria-checked={done} aria-label="회복 완료"
          onClick={() => saveSet(RECOVERY_EXERCISE_ID, 0, null, 0, !done)}
          className={`w-full min-h-[48px] rounded-xl font-bold active:opacity-70 ${done ? 'bg-positive text-white' : 'bg-surface text-ink ring-1 ring-line'}`}>
          {done ? '✓ 완료했어요' : '☐ 완료 체크'}
        </button>
      </div>
    )
  } else {
    const status = sessionStatus(todayLog, session)
    body = (
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-ink font-bold text-lg">{session.name}</p>
            <p className="text-sub text-xs mt-0.5 leading-relaxed">{session.reason}</p>
          </div>
          <span className={`shrink-0 text-xs font-bold rounded-full px-2.5 py-1 ${status === 'done' ? 'bg-positive/15 text-positive' : status === 'in_progress' ? 'bg-brand/15 text-brand' : 'bg-card text-sub'}`}>
            {STATUS_LABEL[status]}
          </span>
        </div>
        {groupSlots(session.slots).map((g) => (
          <ExerciseCard key={g[0].id} slots={g} logs={logs} today={today} todayLog={todayLog} onSaveSet={saveSet} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {body}
      {changeButton}
      {picking && (
        <Sheet title="오늘 할 세션 고르기" onClose={() => setPicking(false)}>
          <p className="text-sub text-xs">주간 루틴은 그대로 두고 오늘만 바꿔요.</p>
          {program.sessions.map((s) => (
            <button key={s.id} onClick={() => changeToday(s.id)} aria-current={s.id === sessionId ? 'true' : undefined}
              className={`w-full min-h-[44px] rounded-xl px-4 text-left font-medium active:opacity-70 ${s.id === sessionId ? 'bg-brand/15 text-brand' : 'bg-card text-ink'}`}>
              {s.name}
            </button>
          ))}
        </Sheet>
      )}
    </div>
  )
}
