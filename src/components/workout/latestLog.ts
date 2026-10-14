import { useQueryClient } from '@tanstack/react-query'
import { useIdentity } from '@/App'
import { useSaveProgram } from '@/hooks/useWorkout'
import type { WorkoutProgramData } from '@/hooks/useWorkout'
import type { Program, WorkoutLog } from '@/engine/workout/types'

/**
 * useSaveLog 계약: mutate 시점의 "현재 캐시" 로그로 페이로드를 만든다.
 * 렌더 시점 데이터는 연속 탭 사이에 낡을 수 있어, 호출 순간 캐시를 직접 읽는다(없으면 렌더 값).
 */
export function useLatestLog(logs: WorkoutLog[], date: string): () => WorkoutLog | undefined {
  const qc = useQueryClient(); const who = useIdentity()
  return () => (qc.getQueryData<WorkoutLog[]>(['workout_logs', who]) ?? logs).find((l) => l.date === date)
}

/**
 * 루틴 저장도 같은 원칙: 탭 순간의 캐시 프로그램을 기준으로 바꾼다(없으면 렌더 값).
 * useSaveProgram은 낙관적 반영이 없어, 저장 직전에 캐시를 새 값으로 먼저 바꿔 둔다
 * (빠른 연속 변경이 서로 덮지 않게). 실패하면 서버 값으로 다시 불러온다.
 */
export function useProgramEditor(fallback: WorkoutProgramData) {
  const qc = useQueryClient(); const who = useIdentity()
  const key = ['workout_program', who]
  const save = useSaveProgram()
  const latest = (): WorkoutProgramData => qc.getQueryData<WorkoutProgramData | null>(key) ?? fallback
  function persist(next: Program) {
    const data = { settings: latest().settings, program: next }
    qc.setQueryData(key, data)
    save.mutate(data, { onError: () => { void qc.invalidateQueries({ queryKey: key }) } })
  }
  return { latest: () => latest().program, persist }
}
