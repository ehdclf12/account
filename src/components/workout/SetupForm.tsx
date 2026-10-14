import { useState } from 'react'
import { useSaveProgram } from '@/hooks/useWorkout'
import { generateProgram, newSeed, DEFAULT_SEED } from '@/engine/workout/generate'
import { DEFAULT_TIME_BUDGET_MIN } from '@/engine/workout/constants'
import type { Settings } from '@/engine/workout/types'

export const MEDICAL_NOTICE = '운동 처방은 일반적인 규칙에 따른 안내이며 의료적 조언이 아니에요'
const DAYS: Settings['daysPerWeek'][] = [3, 4, 5, 6]
const primary = 'flex-1 min-h-[48px] rounded-2xl bg-brand text-white font-bold active:opacity-70 disabled:opacity-50'

/**
 * 조건 입력. 처음(regenerate=false)에는 6일이면 기본 루틴(DEFAULT_SEED), 그 외는 새 시드.
 * 다시 만들기(regenerate=true)에서 6일이면 "기본 루틴으로"와 "새 조합으로 만들기" 중 고른다.
 */
export default function SetupForm(
  { initial, regenerate = false, onDone, onCancel }:
  { initial?: Settings; regenerate?: boolean; onDone?: () => void; onCancel?: () => void },
) {
  const save = useSaveProgram()
  const [days, setDays] = useState<Settings['daysPerWeek']>(initial?.daysPerWeek ?? 6)
  const [budget, setBudget] = useState(String(initial?.timeBudgetMin ?? DEFAULT_TIME_BUDGET_MIN))

  const choose = regenerate && days === 6

  async function create(seed: number) {
    const n = parseInt(budget, 10)
    const settings: Settings = { daysPerWeek: days, timeBudgetMin: Number.isFinite(n) && n > 0 ? n : DEFAULT_TIME_BUDGET_MIN }
    try {
      await save.mutateAsync({ settings, program: generateProgram(settings, seed) })
      onDone?.()
    } catch { /* 전역 토스트 */ }
  }

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-2xl p-4 space-y-4">
        <p className="text-ink font-bold">{regenerate ? '루틴 다시 만들기' : '내 루틴 만들기'}</p>
        <div>
          <p className="text-sub text-xs font-bold">주당 운동 일수</p>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {DAYS.map((d) => (
              <button key={d} onClick={() => setDays(d)} aria-pressed={days === d}
                className={`min-h-[44px] rounded-xl font-bold active:opacity-70 ${days === d ? 'bg-brand text-white' : 'bg-surface text-ink'}`}>
                {d}일
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="wk-budget" className="text-sub text-xs font-bold">웨이트 날 시간 예산(분)</label>
          <input id="wk-budget" type="number" inputMode="numeric" min={20} value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="mt-2 w-full min-h-[44px] bg-surface rounded-xl px-3 text-ink outline-none" />
        </div>
      </div>
      <p className="text-sub text-xs leading-relaxed">{MEDICAL_NOTICE}</p>
      {/* 6일 다시 만들기는 선택지가 둘이라 세로로 쌓는다(375px에서 버튼 셋이 한 줄이면 비좁다) */}
      <div className={choose ? 'flex flex-col gap-2' : 'flex gap-2'}>
        {onCancel && (
          <button onClick={onCancel} className={`${choose ? 'order-last' : ''} flex-1 min-h-[48px] rounded-2xl bg-card text-ink font-bold active:opacity-70`}>취소</button>
        )}
        {choose ? (
          <>
            <button onClick={() => create(DEFAULT_SEED)} disabled={save.isPending} className={primary}>기본 루틴으로</button>
            <button onClick={() => create(newSeed())} disabled={save.isPending} className={primary}>새 조합으로 만들기</button>
          </>
        ) : (
          <button onClick={() => create(!regenerate && days === 6 ? DEFAULT_SEED : newSeed())} disabled={save.isPending} className={primary}>
            {save.isPending ? '만드는 중…' : '생성'}
          </button>
        )}
      </div>
    </div>
  )
}
