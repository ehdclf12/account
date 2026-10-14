import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { generateProgram, DEFAULT_SEED } from '@/engine/workout/generate'
import WorkoutScreen from './WorkoutScreen'

const m = vi.hoisted(() => ({ program: { data: null as unknown, isPending: false, isError: false, refetch: vi.fn() } }))
vi.mock('@/hooks/useWorkout', () => ({
  useWorkoutProgram: () => m.program,
  useWorkoutLogs: () => ({ data: [], isPending: false, isError: false, refetch: vi.fn() }),
  useSaveLog: () => ({ mutate: vi.fn() }),
  useSaveProgram: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/App', () => ({ useIdentity: () => 'husband' }))

function renderScreen() {
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><WorkoutScreen /></MemoryRouter></QueryClientProvider>)
}

describe('WorkoutScreen', () => {
  it('프로그램이 없으면 조건 입력 화면', () => {
    m.program = { ...m.program, data: null }
    renderScreen()
    expect(screen.getByRole('button', { name: '생성' })).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).toBeNull()
  })

  it('프로그램이 있으면 오늘·주간·기록 탭', () => {
    m.program = { ...m.program, data: { settings: { daysPerWeek: 6, timeBudgetMin: 70 }, program: generateProgram({ daysPerWeek: 6, timeBudgetMin: 70 }, DEFAULT_SEED) } }
    renderScreen()
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['오늘', '주간', '기록'])
    fireEvent.click(screen.getByRole('tab', { name: '기록' }))
    expect(screen.getByText(/아직 기록이 없어요/)).toBeInTheDocument()
  })

  it('루틴 다시 만들기는 확인 후 조건 입력으로', () => {
    m.program = { ...m.program, data: { settings: { daysPerWeek: 6, timeBudgetMin: 70 }, program: generateProgram({ daysPerWeek: 6, timeBudgetMin: 70 }, DEFAULT_SEED) } }
    const spy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderScreen()
    fireEvent.click(screen.getByRole('tab', { name: '주간' }))
    fireEvent.click(screen.getByRole('button', { name: '루틴 다시 만들기' }))
    expect(spy.mock.calls[0][0]).toBe('현재 루틴과 바꾼 종목은 사라지고 새로 만들어져요. 지난 기록은 남아요.')
    expect(screen.getByRole('button', { name: '기본 루틴으로' })).toBeInTheDocument()
    spy.mockRestore()
  })
})
