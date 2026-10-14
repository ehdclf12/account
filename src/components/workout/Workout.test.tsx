import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { generateProgram, DEFAULT_SEED } from '@/engine/workout/generate'
import { RECOVERY_EXERCISE_ID, RECOVERY_REASON, SPLITS, WEEKDAY_SHORT } from '@/engine/workout/constants'
import { swapDays } from '@/engine/workout/schedule'
import type { WorkoutLog } from '@/engine/workout/types'
import SetupForm, { MEDICAL_NOTICE } from './SetupForm'
import TodayTab from './TodayTab'
import WeekTab from './WeekTab'
import HistoryTab from './HistoryTab'

const m = vi.hoisted(() => ({ saveLog: vi.fn(), saveProgram: vi.fn(), saveProgramAsync: vi.fn() }))
vi.mock('@/hooks/useWorkout', () => ({
  useSaveLog: () => ({ mutate: m.saveLog }),
  useSaveProgram: () => ({ mutate: m.saveProgram, mutateAsync: m.saveProgramAsync, isPending: false }),
}))
vi.mock('@/App', () => ({ useIdentity: () => 'husband' }))

function renderQ(ui: ReactElement, qc = new QueryClient()) {
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

const six = generateProgram({ daysPerWeek: 6, timeBudgetMin: 70 }, DEFAULT_SEED)
const settings6 = { daysPerWeek: 6 as const, timeBudgetMin: 70 }
const MON = '2026-10-12'
const TUE = '2026-10-13'   // 6일 분할: 화 = 어깨 A

function ohpLog(date: string, kg: number, reps: number): WorkoutLog {
  return {
    date, sessionId: 'shoulder-a',
    sets: [0, 1, 2, 3].map((i) => ({ exerciseId: 'overhead-press', setIndex: i, weightKg: kg, reps, done: true })),
  }
}

beforeEach(() => { m.saveLog.mockReset(); m.saveProgram.mockReset(); m.saveProgramAsync.mockReset().mockResolvedValue(undefined) })

describe('SetupForm', () => {
  it('의료 고지를 보여주고, 고른 일수로 루틴을 만들어 저장한다', async () => {
    renderQ(<SetupForm />)
    expect(screen.getByText(MEDICAL_NOTICE)).toBeInTheDocument()
    expect(MEDICAL_NOTICE).toBe('운동 처방은 일반적인 규칙에 따른 안내이며 의료적 조언이 아니에요')
    fireEvent.click(screen.getByRole('button', { name: '4일' }))
    fireEvent.click(screen.getByRole('button', { name: '생성' }))
    expect(m.saveProgramAsync).toHaveBeenCalledTimes(1)
    const arg = m.saveProgramAsync.mock.calls[0][0]
    expect(arg.settings).toEqual({ daysPerWeek: 4, timeBudgetMin: 70 })
    expect(arg.program.weekSchedule).toEqual(SPLITS[4])
  })

  it('6일 첫 생성은 기본 루틴(DEFAULT_SEED)', () => {
    renderQ(<SetupForm />)
    fireEvent.click(screen.getByRole('button', { name: '생성' }))
    expect(m.saveProgramAsync.mock.calls[0][0].program).toEqual(six)
  })
})

describe('SetupForm 다시 만들기', () => {
  const initial = { daysPerWeek: 6 as const, timeBudgetMin: 70 }

  it('6일이면 "기본 루틴으로"와 "새 조합으로 만들기" 두 선택지', () => {
    renderQ(<SetupForm regenerate initial={initial} onCancel={vi.fn()} />)
    expect(screen.getByRole('button', { name: '기본 루틴으로' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '새 조합으로 만들기' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '생성' })).toBeNull()
  })

  it('"기본 루틴으로"는 DEFAULT_SEED 루틴을 저장', () => {
    renderQ(<SetupForm regenerate initial={initial} />)
    fireEvent.click(screen.getByRole('button', { name: '기본 루틴으로' }))
    const arg = m.saveProgramAsync.mock.calls[0][0]
    expect(arg.settings).toEqual(initial)
    expect(arg.program).toEqual(generateProgram(initial, DEFAULT_SEED))
  })

  it('"새 조합으로 만들기"는 다른 시드로 만든다', () => {
    renderQ(<SetupForm regenerate initial={initial} />)
    fireEvent.click(screen.getByRole('button', { name: '새 조합으로 만들기' }))
    const { program, settings } = m.saveProgramAsync.mock.calls[0][0]
    expect(program.seed).not.toBe(DEFAULT_SEED)
    expect(program).toEqual(generateProgram(settings, program.seed))
  })

  it('3·4·5일은 선택지 없이 새 시드로 생성', () => {
    renderQ(<SetupForm regenerate initial={{ daysPerWeek: 4, timeBudgetMin: 70 }} />)
    expect(screen.queryByRole('button', { name: '기본 루틴으로' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '생성' }))
    const { program } = m.saveProgramAsync.mock.calls[0][0]
    expect(program.seed).not.toBe(DEFAULT_SEED)
    expect(program.weekSchedule).toEqual(SPLITS[4])
  })
})

describe('TodayTab', () => {
  it('처방 무게와 이유를 보여주고, 세트 체크는 입력한 무게·횟수로 done:true 저장', () => {
    renderQ(<TodayTab program={six} logs={[ohpLog('2026-10-06', 40, 8)]} today={TUE} />)
    expect(screen.getByText('어깨 A')).toBeInTheDocument()
    expect(screen.getByText(/지난번 4세트 모두 8회 성공 → 2.5kg 올려보세요/)).toBeInTheDocument()
    const w = screen.getByLabelText('오버헤드프레스 1세트 무게') as HTMLInputElement
    const r = screen.getByLabelText('오버헤드프레스 1세트 횟수') as HTMLInputElement
    expect(w.value).toBe('42.5')
    expect(r.value).toBe('6')
    fireEvent.change(w, { target: { value: '45' } })
    fireEvent.change(r, { target: { value: '7' } })
    fireEvent.click(screen.getByRole('checkbox', { name: '오버헤드프레스 1세트 완료' }))
    expect(m.saveLog).toHaveBeenCalledWith({
      date: TUE, sessionId: 'shoulder-a',
      sets: [{ exerciseId: 'overhead-press', setIndex: 0, weightKg: 45, reps: 7, done: true }],
    })
  })

  it('첫 기록은 무게를 비우고 첫 기록 안내, 횟수는 목표 최대값', () => {
    renderQ(<TodayTab program={six} logs={[]} today={TUE} />)
    expect((screen.getByLabelText('오버헤드프레스 1세트 무게') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('오버헤드프레스 1세트 횟수') as HTMLInputElement).value).toBe('8')
    expect(screen.getAllByText(/처음 하는 종목이에요/).length).toBeGreaterThan(0)
    expect(screen.getByText('시작 전')).toBeInTheDocument()
  })

  it('저장된 세트는 저장값과 체크 상태를 보여주고, 수정 후 blur하면 저장', () => {
    const log: WorkoutLog = { date: TUE, sessionId: 'shoulder-a', sets: [{ exerciseId: 'overhead-press', setIndex: 0, weightKg: 50, reps: 5, done: true }] }
    renderQ(<TodayTab program={six} logs={[log]} today={TUE} />)
    const w = screen.getByLabelText('오버헤드프레스 1세트 무게') as HTMLInputElement
    expect(w.value).toBe('50')
    expect(screen.getByRole('checkbox', { name: '오버헤드프레스 1세트 완료' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('진행 중')).toBeInTheDocument()
    fireEvent.change(w, { target: { value: '52.3' } })
    fireEvent.blur(w)
    expect(m.saveLog).toHaveBeenCalledWith({ ...log, sets: [{ ...log.sets[0], weightKg: 52.5 }] })
  })

  it('첫 기록: 앞 세트에 저장한 무게를 다음 세트들이 이어받는다', () => {
    const qc = new QueryClient()
    const { rerender } = renderQ(<TodayTab program={six} logs={[]} today={TUE} />, qc)
    const w1 = screen.getByLabelText('오버헤드프레스 1세트 무게') as HTMLInputElement
    fireEvent.change(w1, { target: { value: '30' } })
    fireEvent.click(screen.getByRole('checkbox', { name: '오버헤드프레스 1세트 완료' }))
    const saved = m.saveLog.mock.calls[0][0] as WorkoutLog
    expect(saved.sets[0].weightKg).toBe(30)
    rerender(<QueryClientProvider client={qc}><TodayTab program={six} logs={[saved]} today={TUE} /></QueryClientProvider>)
    for (const n of [2, 3, 4]) {
      expect((screen.getByLabelText(`오버헤드프레스 ${n}세트 무게`) as HTMLInputElement).value).toBe('30')
    }
    // 다른 종목은 영향 없음
    expect((screen.getByLabelText('바벨 벤치프레스 2세트 무게') as HTMLInputElement).value).toBe('')
  })

  it('슈퍼세트 두 종목은 한 카드에서 번갈아 나온다', () => {
    renderQ(<TodayTab program={six} logs={[]} today={TUE} />)
    const card = screen.getByText(/슈퍼세트/).parentElement as HTMLElement
    const labels = within(card).getAllByRole('checkbox').map((c) => c.getAttribute('aria-label'))
    expect(labels.slice(0, 4)).toEqual([
      '오버헤드 케이블 익스텐션 1세트 완료', '케이블 푸시다운 1세트 완료',
      '오버헤드 케이블 익스텐션 2세트 완료', '케이블 푸시다운 2세트 완료',
    ])
  })

  it('휴식일은 "오늘은 쉬는 날"', () => {
    const three = generateProgram({ daysPerWeek: 3, timeBudgetMin: 70 }, 7)
    renderQ(<TodayTab program={three} logs={[]} today={TUE} />)
    expect(screen.getByText('오늘은 쉬는 날')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '오늘만 바꾸기' })).toBeInTheDocument()
  })

  it('회복일은 안내 문구와 완료 체크 하나, 체크하면 회복 표식 저장', () => {
    renderQ(<TodayTab program={six} logs={[]} today={MON} />)
    expect(screen.getByText(RECOVERY_REASON)).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(1)
    fireEvent.click(screen.getByRole('checkbox', { name: '회복 완료' }))
    expect(m.saveLog).toHaveBeenCalledWith({
      date: MON, sessionId: 'recovery',
      sets: [{ exerciseId: RECOVERY_EXERCISE_ID, setIndex: 0, weightKg: null, reps: 0, done: true }],
    })
  })

  it('회복 체크 해제는 done:false로 저장', () => {
    const log: WorkoutLog = { date: MON, sessionId: 'recovery', sets: [{ exerciseId: RECOVERY_EXERCISE_ID, setIndex: 0, weightKg: null, reps: 0, done: true }] }
    renderQ(<TodayTab program={six} logs={[log]} today={MON} />)
    fireEvent.click(screen.getByRole('checkbox', { name: '회복 완료' }))
    expect(m.saveLog.mock.calls[0][0].sets[0].done).toBe(false)
  })

  it('오늘만 바꾸기는 고른 sessionId로 오늘 기록을 저장(기존 세트 유지)', () => {
    const log = ohpLog(TUE, 40, 8)
    renderQ(<TodayTab program={six} logs={[log]} today={TUE} />)
    fireEvent.click(screen.getByRole('button', { name: '오늘만 바꾸기' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '등 A' }))
    expect(m.saveLog).toHaveBeenCalledWith({ ...log, sessionId: 'back-a' })
  })
})

describe('WeekTab', () => {
  const props = { program: six, settings: settings6, logs: [] as WorkoutLog[], today: TUE, onRegenerate: vi.fn() }

  it('7일 행: 세션 이름과 간격 문구', () => {
    renderQ(<WeekTab {...props} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(7)
    expect(screen.getByRole('button', { name: '금요일 어깨 B' })).toHaveTextContent('어깨 화요일 이후 72시간')
  })

  it('규칙 위반 맞바꾸기는 경고와 대안을 보여주고, "그래도 바꾸기"면 저장', () => {
    renderQ(<WeekTab {...props} />)
    fireEvent.click(screen.getByRole('button', { name: '요일 바꾸기' }))
    fireEvent.click(screen.getByRole('button', { name: '화요일 어깨 A' }))
    fireEvent.click(screen.getByRole('button', { name: '목요일 등 A' }))
    const dlg = screen.getByRole('dialog')
    expect(within(dlg).getByText(/48시간 이상 필요해요/)).toBeInTheDocument()
    expect(within(dlg).getAllByRole('button', { name: /과 바꾸기$|와 바꾸기$/ }).length).toBeGreaterThan(0)
    expect(m.saveProgram).not.toHaveBeenCalled()
    fireEvent.click(within(dlg).getByRole('button', { name: '그래도 바꾸기' }))
    const saved = m.saveProgram.mock.calls[0][0]
    expect(saved.settings).toEqual(settings6)
    expect(saved.program.weekSchedule[1]).toBe('back-a')
    expect(saved.program.weekSchedule[3]).toBe('shoulder-a')
  })

  it('대안 요일을 누르면 그 요일과 바꿔 저장', () => {
    const { alternatives } = swapDays(six, 1, 3)
    expect(alternatives.length).toBeGreaterThan(0)
    const c = alternatives[0]
    renderQ(<WeekTab {...props} />)
    fireEvent.click(screen.getByRole('button', { name: '요일 바꾸기' }))
    fireEvent.click(screen.getByRole('button', { name: '화요일 어깨 A' }))
    fireEvent.click(screen.getByRole('button', { name: '목요일 등 A' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: new RegExp(`^${WEEKDAY_SHORT[c]}요일\\(.*바꾸기$`) }))
    expect(m.saveProgram).toHaveBeenCalledTimes(1)
    const ws = m.saveProgram.mock.calls[0][0].program.weekSchedule
    const expected = [...six.weekSchedule]
    ;[expected[1], expected[c]] = [expected[c], expected[1]]
    expect(ws).toEqual(expected)
    expect(ws[c]).toBe('shoulder-a')
  })

  it('종목 바꾸기: 후보를 고르면 그 종목으로 저장', () => {
    renderQ(<WeekTab {...props} />)
    fireEvent.click(screen.getByRole('button', { name: '화요일 어깨 A' }))
    fireEvent.click(screen.getByRole('button', { name: /오버헤드프레스/ }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /덤벨 숄더프레스/ }))
    const p = m.saveProgram.mock.calls[0][0].program
    expect(p.sessions.find((s: { id: string }) => s.id === 'shoulder-a').slots[0].exerciseId).toBe('dumbbell-shoulder-press')
  })
})

describe('WeekTab 연속 저장', () => {
  it('빠르게 두 번 종목을 바꿔도 두 번째 저장이 첫 번째 변경을 유지한다(캐시 기준)', () => {
    const qc = new QueryClient()
    qc.setQueryData(['workout_program', 'husband'], { settings: settings6, program: six })
    renderQ(<WeekTab program={six} settings={settings6} logs={[]} today={TUE} onRegenerate={vi.fn()} />, qc)
    fireEvent.click(screen.getByRole('button', { name: '화요일 어깨 A' }))
    fireEvent.click(screen.getByRole('button', { name: /오버헤드프레스/ }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /덤벨 숄더프레스/ }))
    fireEvent.click(screen.getByRole('button', { name: /바벨 벤치프레스/ }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^딥스/ }))
    expect(m.saveProgram).toHaveBeenCalledTimes(2)
    const slots = m.saveProgram.mock.calls[1][0].program.sessions.find((x: { id: string }) => x.id === 'shoulder-a').slots
    expect(slots[0].exerciseId).toBe('dumbbell-shoulder-press')
    expect(slots[1].exerciseId).toBe('dips')
  })
})

describe('HistoryTab', () => {
  it('종목을 누르면 날짜별 세트와 추정 1RM(최고 세트, 소수 1자리)', () => {
    const logs: WorkoutLog[] = [{
      date: '2026-10-06', sessionId: 'legs-a', sets: [
        { exerciseId: 'back-squat', setIndex: 0, weightKg: 100, reps: 5, done: true },
        { exerciseId: 'back-squat', setIndex: 1, weightKg: 90, reps: 6, done: true },
        { exerciseId: 'back-squat', setIndex: 2, weightKg: 120, reps: 1, done: false },
      ],
    }]
    renderQ(<HistoryTab logs={logs} />)
    fireEvent.click(screen.getByRole('button', { name: /백스쿼트/ }))
    expect(screen.getByText('100×5 · 90×6')).toBeInTheDocument()
    expect(screen.getByText('116.7kg')).toBeInTheDocument()   // 100×(1+5/30)
  })
})
