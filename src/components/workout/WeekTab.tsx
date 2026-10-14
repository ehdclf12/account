import { useState } from 'react'
import { useSaveProgram } from '@/hooks/useWorkout'
import { intervalTexts, swapDays, weekdayIndex } from '@/engine/workout/schedule'
import type { ScheduleViolation } from '@/engine/workout/schedule'
import { candidatesFor, swapExercise } from '@/engine/workout/generate'
import { findSession, sessionStatus, thisWeekLogs } from '@/engine/workout/today'
import { WEEKDAY_SHORT } from '@/engine/workout/constants'
import { getExercise } from '@/data/workout/exercises'
import { showToast } from '@/lib/toast'
import type { Program, Settings, Slot, WorkoutLog } from '@/engine/workout/types'
import Sheet from './Sheet'
import { STATUS_LABEL } from './format'

interface PendingSwap { a: number; b: number; program: Program; violations: ScheduleViolation[]; alternatives: number[] }

export default function WeekTab(
  { program, settings, logs, today, onRegenerate }:
  { program: Program; settings: Settings; logs: WorkoutLog[]; today: string; onRegenerate: () => void },
) {
  const save = useSaveProgram()
  const [swapMode, setSwapMode] = useState(false)
  const [first, setFirst] = useState<number | null>(null)
  const [pending, setPending] = useState<PendingSwap | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const [picking, setPicking] = useState<{ sessionId: string; slot: Slot } | null>(null)

  const todayIdx = weekdayIndex(today)
  const weekLogs = thisWeekLogs(logs, today)
  const texts = intervalTexts(program, weekLogs, todayIdx)
  const logAt = (d: number) => weekLogs.find((l) => weekdayIndex(l.date) === d)
  const nameAt = (d: number) => findSession(program, program.weekSchedule[d])?.name ?? '휴식'

  function persist(next: Program) {
    save.mutate({ settings, program: next })
  }

  function endSwap() { setSwapMode(false); setFirst(null); setPending(null) }

  function tapDay(d: number) {
    if (!swapMode) { setOpen(open === d ? null : d); return }
    if (first === null) { setFirst(d); return }
    if (first === d) { setFirst(null); return }
    trySwap(first, d)
  }

  function trySwap(a: number, b: number) {
    const r = swapDays(program, a, b)
    if (r.violations.length === 0) { persist(r.program); endSwap(); return }
    setPending({ a, b, ...r })
  }

  function pickExercise(exerciseId: string) {
    if (!picking) return
    const r = swapExercise(program, picking.sessionId, picking.slot.id, exerciseId)
    persist(r.program)
    if (r.warning) showToast(r.warning)
    setPicking(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sub text-xs">
          {swapMode ? (first === null ? '바꿀 첫 요일을 고르세요' : `${WEEKDAY_SHORT[first]}요일과 바꿀 요일을 고르세요`) : '요일을 누르면 종목을 볼 수 있어요'}
        </p>
        <button onClick={() => (swapMode ? endSwap() : setSwapMode(true))}
          className={`min-h-[44px] px-3 rounded-xl text-sm font-bold active:opacity-70 ${swapMode ? 'bg-brand text-white' : 'bg-card text-ink'}`}>
          {swapMode ? '취소' : '요일 바꾸기'}
        </button>
      </div>

      <ul className="space-y-2">
        {program.weekSchedule.map((id, d) => {
          const log = logAt(d)
          const effId = log?.sessionId ?? id
          const session = findSession(program, effId)
          const planned = findSession(program, id)
          const st = session && d <= todayIdx ? sessionStatus(log, session) : null
          const status = !st ? '' : d < todayIdx && st === 'todo' ? '기록 없음' : STATUS_LABEL[st]
          const selected = swapMode && first === d
          return (
            <li key={d} className={`bg-card rounded-2xl ${selected ? 'ring-2 ring-brand' : ''} ${d === todayIdx ? 'border border-brand/40' : ''}`}>
              <button onClick={() => tapDay(d)} aria-label={`${WEEKDAY_SHORT[d]}요일 ${planned?.name ?? '휴식'}`}
                className="w-full min-h-[56px] px-4 py-2.5 flex items-center gap-3 text-left active:opacity-70">
                <span className={`w-6 font-bold ${d === todayIdx ? 'text-brand' : 'text-sub'}`}>{WEEKDAY_SHORT[d]}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-ink font-medium truncate">
                    {planned?.name ?? '휴식'}
                    {log && log.sessionId !== id && <span className="text-brand text-xs"> → 오늘만 {session?.name ?? ''}</span>}
                  </span>
                  {texts[d] && <span className="block text-sub text-xs truncate">{texts[d]}</span>}
                </span>
                {status && <span className="text-xs text-sub shrink-0">{status}</span>}
              </button>
              {!swapMode && open === d && planned && planned.kind !== 'recovery' && (
                <div className="px-4 pb-3 space-y-1">
                  {planned.slots.map((sl) => (
                    <button key={sl.id} onClick={() => setPicking({ sessionId: planned.id, slot: sl })}
                      className="w-full min-h-[44px] flex items-center justify-between gap-2 bg-surface rounded-xl px-3 text-left active:opacity-70">
                      <span className="text-ink text-sm truncate">{getExercise(sl.exerciseId)?.nameKo ?? sl.exerciseId}</span>
                      <span className="text-sub text-xs shrink-0">{sl.sets}×{sl.repMin === sl.repMax ? sl.repMax : `${sl.repMin}~${sl.repMax}`} · 종목 바꾸기</span>
                    </button>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <button onClick={onRegenerate}
        className="w-full min-h-[44px] rounded-2xl bg-card text-sub text-sm font-medium active:opacity-70">
        루틴 다시 만들기
      </button>

      {pending && (
        <Sheet title="요일 바꾸기 경고" onClose={endSwap}>
          <ul className="space-y-1">
            {pending.violations.map((v, i) => <li key={i} className="text-danger text-sm">{v.message}</li>)}
          </ul>
          {pending.alternatives.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-sub text-xs font-bold">{WEEKDAY_SHORT[pending.a]}요일({nameAt(pending.a)})은 이 요일과 바꾸면 규칙을 지켜요</p>
              {pending.alternatives.map((c) => (
                <button key={c} onClick={() => trySwap(pending.a, c)}
                  className="w-full min-h-[44px] rounded-xl bg-card text-ink px-4 text-left text-sm font-medium active:opacity-70">
                  {WEEKDAY_SHORT[c]}요일({nameAt(c)})과 바꾸기
                </button>
              ))}
            </div>
          ) : <p className="text-sub text-xs">규칙을 지키는 다른 요일이 없어요.</p>}
          <button onClick={() => { persist(pending.program); endSwap() }}
            className="w-full min-h-[44px] rounded-xl bg-danger/15 text-danger font-bold active:opacity-70">
            그래도 바꾸기
          </button>
        </Sheet>
      )}

      {picking && (
        <Sheet title="종목 바꾸기" onClose={() => setPicking(null)}>
          <ExercisePicker program={program} sessionId={picking.sessionId} slot={picking.slot} onPick={pickExercise} />
        </Sheet>
      )}
    </div>
  )
}

function ExercisePicker(
  { program, sessionId, slot, onPick }:
  { program: Program; sessionId: string; slot: Slot; onPick: (id: string) => void },
) {
  // 같은 세션의 다른 슬롯 종목은 뺀다(기록이 종목·세트 번호로 이어져 한 세션에 같은 종목이 둘이면 섞인다).
  const others = new Set(findSession(program, sessionId)?.slots.filter((s) => s.id !== slot.id).map((s) => s.exerciseId))
  const list = candidatesFor(slot).filter((e) => !others.has(e.id))
  return (
    <div className="space-y-1.5">
      {list.map((e) => (
        <button key={e.id} onClick={() => onPick(e.id)} disabled={e.id === slot.exerciseId}
          className={`w-full min-h-[44px] rounded-xl px-4 text-left text-sm font-medium active:opacity-70 ${e.id === slot.exerciseId ? 'bg-brand/15 text-brand' : 'bg-card text-ink'}`}>
          {e.nameKo}{e.id === slot.exerciseId ? ' (지금)' : ''}{e.stretchEmphasis ? ' · 신장 강조' : ''}
        </button>
      ))}
    </div>
  )
}
