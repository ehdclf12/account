import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useIdentity } from '@/App'
import type { Role, TimeBlock, TimeSession } from '@/types'

// 세션 조회 범위. 오늘·이번 주 집계에는 7일이면 충분하지만, 2단계 월간 히트맵까지
// 같은 캐시를 쓰도록 넉넉히 잡는다.
const LOOKBACK_DAYS = 60

function lookbackISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - LOOKBACK_DAYS)
  return d.toISOString()
}

export function useTimeBlocks() {
  const who = useIdentity()
  return useQuery({
    queryKey: ['time_blocks', who],
    queryFn: async (): Promise<TimeBlock[]> => {
      const { data, error } = await supabase.from('time_blocks')
        .select('*').eq('who', who).eq('archived', false)
        .order('sort_order').order('created_at')
      if (error) throw error
      return data as TimeBlock[]
    },
  })
}

export function useTimeSessions() {
  const who = useIdentity()
  return useQuery({
    queryKey: ['time_sessions', who],
    queryFn: async (): Promise<TimeSession[]> => {
      const { data, error } = await supabase.from('time_sessions')
        .select('*').eq('who', who).gte('started_at', lookbackISO())
        .order('started_at', { ascending: false })
      if (error) throw error
      return data as TimeSession[]
    },
  })
}

export function useAddBlock() {
  const qc = useQueryClient(); const who = useIdentity()
  return useMutation({
    mutationFn: async (b: { name: string; emoji: string; color: string | null; sort_order: number }) => {
      const { error } = await supabase.from('time_blocks').insert({ ...b, who })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_blocks', who] }),
  })
}

export function useUpdateBlock() {
  const qc = useQueryClient(); const who = useIdentity()
  return useMutation({
    mutationFn: async ({ id, ...rest }: Partial<TimeBlock> & { id: string }) => {
      const { error } = await supabase.from('time_blocks').update(rest).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_blocks', who] }),
  })
}

export function useDeleteBlock() {
  const qc = useQueryClient(); const who = useIdentity()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('time_blocks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time_blocks', who] })
      // 세션은 on delete cascade로 함께 지워진다
      qc.invalidateQueries({ queryKey: ['time_sessions', who] })
    },
  })
}

/** 진행 중 세션을 끝내고 새 블럭으로 시작한다(전환). 같은 블럭이면 정지만 한다. */
export function useStartTimer() {
  const qc = useQueryClient(); const who = useIdentity()
  return useMutation({
    mutationFn: async ({ blockId, runningId }: { blockId: string; runningId: string | null }) => {
      await stopRunning(who, runningId)
      const { error } = await supabase.from('time_sessions').insert({ block_id: blockId, who })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_sessions', who] }),
  })
}

export function useStopTimer() {
  const qc = useQueryClient(); const who = useIdentity()
  return useMutation({
    mutationFn: async (runningId: string | null) => { await stopRunning(who, runningId) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_sessions', who] }),
  })
}

// 진행 중 세션 종료. id를 모를 수도 있으니(다른 기기에서 시작) who 기준으로도 함께 닫는다.
async function stopRunning(who: Role, runningId: string | null) {
  const q = supabase.from('time_sessions').update({ ended_at: new Date().toISOString() })
  const { error } = runningId
    ? await q.eq('id', runningId)
    : await q.eq('who', who).is('ended_at', null)
  if (error) throw error
}
