import { useState } from 'react'
import { getExercise } from '@/data/workout/exercises'
import { prescribe } from '@/engine/workout/prescribe'
import type { Prescription } from '@/engine/workout/prescribe'
import type { SetEntry, Slot, WorkoutLog } from '@/engine/workout/types'
import { fmtKg, parseReps, parseWeight } from './format'

export type SaveSet = (exerciseId: string, setIndex: number, weightKg: number | null, reps: number, done: boolean) => void

interface SlotView { slot: Slot; name: string; rx: Prescription | null }

function slotView(slot: Slot, logs: WorkoutLog[], today: string): SlotView {
  const ex = getExercise(slot.exerciseId)
  return {
    slot,
    name: ex?.nameKo ?? slot.exerciseId,
    rx: ex ? prescribe(logs, slot, ex, { before: today }) : null,
  }
}

/**
 * 처방 무게가 없을 때(첫 기록) 미리 채울 무게: 오늘 이 종목에서 저장된 바로 앞(낮은 setIndex) 세트의 무게.
 * 1세트에 무게를 넣고 체크하면 2세트부터 그 무게로 채워진다.
 */
export function carriedWeight(todayLog: WorkoutLog | undefined, exerciseId: string, setIndex: number): number | null {
  let best: SetEntry | undefined
  for (const s of todayLog?.sets ?? []) {
    if (s.exerciseId !== exerciseId || s.setIndex >= setIndex || s.weightKg === null) continue
    if (!best || s.setIndex > best.setIndex) best = s
  }
  return best?.weightKg ?? null
}

/** 종목 카드. 슬롯이 둘이면 슈퍼세트: 한 카드에서 두 종목 세트를 번갈아 보여준다. */
export default function ExerciseCard(
  { slots, logs, today, todayLog, onSaveSet }:
  { slots: Slot[]; logs: WorkoutLog[]; today: string; todayLog: WorkoutLog | undefined; onSaveSet: SaveSet },
) {
  const views = slots.map((s) => slotView(s, logs, today))
  const superset = views.length > 1
  const rounds = Math.max(...views.map((v) => v.slot.sets))
  const rows: { v: SlotView; i: number }[] = []
  for (let i = 0; i < rounds; i++) for (const v of views) if (i < v.slot.sets) rows.push({ v, i })

  return (
    <div className="bg-card rounded-2xl p-4 space-y-3">
      {superset && <p className="text-brand text-xs font-bold">슈퍼세트 · 번갈아 1세트씩</p>}
      {views.map((v) => (
        <div key={v.slot.id}>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-ink font-bold">{v.name}</p>
            <p className="text-sub text-sm shrink-0">{v.slot.sets}×{v.slot.repMin === v.slot.repMax ? v.slot.repMax : `${v.slot.repMin}~${v.slot.repMax}`}</p>
          </div>
          {v.rx && (
            <p className="text-sub text-xs mt-1 leading-relaxed">
              {v.rx.weightKg !== null && <span className="text-ink font-bold">{fmtKg(v.rx.weightKg)}kg · </span>}
              {v.rx.reason}
            </p>
          )}
        </div>
      ))}
      <div className="space-y-2">
        {rows.map(({ v, i }) => (
          <SetRow key={`${v.slot.id}#${i}`}
            label={`${v.name} ${i + 1}세트`} short={superset ? v.name : `${i + 1}세트`}
            saved={todayLog?.sets.find((s) => s.exerciseId === v.slot.exerciseId && s.setIndex === i)}
            prefillWeight={v.rx?.weightKg ?? carriedWeight(todayLog, v.slot.exerciseId, i)}
            prefillReps={v.rx?.targetReps[i] ?? v.slot.repMax}
            onSave={(w, r, done) => onSaveSet(v.slot.exerciseId, i, w, r, done)} />
        ))}
      </div>
    </div>
  )
}

function SetRow(
  { label, short, saved, prefillWeight, prefillReps, onSave }:
  {
    label: string; short: string; saved: SetEntry | undefined
    prefillWeight: number | null; prefillReps: number
    onSave: (weightKg: number | null, reps: number, done: boolean) => void
  },
) {
  // 저장값이 있으면 저장값, 없으면 처방값. 한 번 고친 값(draft)은 그 줄에 계속 남긴다
  // (저장 직후 캐시 알림 전 잠깐 옛 값으로 깜빡이지 않게).
  const base = saved
    ? { w: saved.weightKg === null ? '' : fmtKg(saved.weightKg), r: String(saved.reps) }
    : { w: prefillWeight === null ? '' : fmtKg(prefillWeight), r: String(prefillReps) }
  const [draft, setDraft] = useState<{ w: string; r: string } | null>(null)
  const cur = draft ?? base
  const checked = saved?.done === true
  const reps = () => parseReps(cur.r, prefillReps)

  function toggle() {
    onSave(parseWeight(cur.w), reps(), !checked)
  }

  function blur() {
    if (!draft) return
    const w = parseWeight(cur.w); const r = reps()
    setDraft({ w: w === null ? '' : fmtKg(w), r: String(r) })   // 0.5kg 단위로 맞춰 보여준다
    if (checked && saved && (w !== saved.weightKg || r !== saved.reps)) onSave(w, r, true)
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sub text-xs w-12 shrink-0 truncate">{short}</span>
      <div className="flex-1 min-w-0 flex items-center bg-surface rounded-xl px-1.5 min-h-[44px]">
        <input aria-label={`${label} 무게`} type="number" inputMode="decimal" step="0.5" min={0}
          value={cur.w} placeholder="—" onBlur={blur}
          onChange={(e) => setDraft({ ...cur, w: e.target.value })}
          className="w-full min-w-0 bg-transparent outline-none text-ink text-right" />
        <span className="text-sub text-xs ml-0.5">kg</span>
      </div>
      <div className="flex-1 min-w-0 flex items-center bg-surface rounded-xl px-1.5 min-h-[44px]">
        <input aria-label={`${label} 횟수`} type="number" inputMode="numeric" step="1" min={0}
          value={cur.r} onBlur={blur}
          onChange={(e) => setDraft({ ...cur, r: e.target.value })}
          className="w-full min-w-0 bg-transparent outline-none text-ink text-right" />
        <span className="text-sub text-xs ml-0.5">회</span>
      </div>
      <button role="checkbox" aria-checked={checked} aria-label={`${label} 완료`} onClick={toggle}
        className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-lg font-bold active:opacity-70
          ${checked ? 'bg-positive text-white' : 'bg-surface text-sub ring-1 ring-line'}`}>
        {checked ? '✓' : ''}
      </button>
    </div>
  )
}
