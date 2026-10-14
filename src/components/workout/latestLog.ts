import { useQueryClient } from '@tanstack/react-query'
import { useIdentity } from '@/App'
import type { WorkoutLog } from '@/engine/workout/types'

/**
 * useSaveLog 계약: mutate 시점의 "현재 캐시" 로그로 페이로드를 만든다.
 * 렌더 시점 데이터는 연속 탭 사이에 낡을 수 있어, 호출 순간 캐시를 직접 읽는다(없으면 렌더 값).
 */
export function useLatestLog(logs: WorkoutLog[], date: string): () => WorkoutLog | undefined {
  const qc = useQueryClient(); const who = useIdentity()
  return () => (qc.getQueryData<WorkoutLog[]>(['workout_logs', who]) ?? logs).find((l) => l.date === date)
}
