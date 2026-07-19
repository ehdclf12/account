import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useIdentity } from '@/App'
import type { Role, TimeBlock, TimeBlockGroup, TimeSession } from '@/types'

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

/**
 * 임의 구간의 세션. 캘린더 히트맵은 42칸 격자가 보는 범위가 매달 달라
 * 고정 60일 캐시로는 지난 달을 못 채운다.
 */
export function useSessionsInRange(fromISO: string, toExclusiveISO: string) {
  const who = useIdentity()
  return useQuery({
    queryKey: ['time_sessions', 'range', who, fromISO, toExclusiveISO],
    queryFn: async (): Promise<TimeSession[]> => {
      const { data, error } = await supabase.from('time_sessions')
        .select('*').eq('who', who)
        .gte('started_at', new Date(`${fromISO}T00:00:00`).toISOString())
        .lt('started_at', new Date(`${toExclusiveISO}T00:00:00`).toISOString())
        .order('started_at', { ascending: false })
      if (error) throw error
      return data as TimeSession[]
    },
  })
}

export function useBlockGroups() {
  const who = useIdentity()
  return useQuery({
    queryKey: ['time_block_groups', who],
    queryFn: async (): Promise<TimeBlockGroup[]> => {
      const { data, error } = await supabase.from('time_block_groups')
        .select('*').eq('who', who).order('sort_order').order('created_at')
      if (error) throw error
      return data as TimeBlockGroup[]
    },
  })
}

export function useAddGroup() {
  const qc = useQueryClient(); const who = useIdentity()
  return useMutation({
    mutationFn: async (g: { name: string; sort_order: number }): Promise<string> => {
      const { data, error } = await supabase.from('time_block_groups')
        .insert({ ...g, who }).select('id').single()
      if (error) throw error
      return (data as { id: string }).id
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_block_groups', who] }),
  })
}

export function useUpdateGroup() {
  const qc = useQueryClient(); const who = useIdentity()
  return useMutation({
    mutationFn: async ({ id, ...rest }: Partial<TimeBlockGroup> & { id: string }) => {
      const { error } = await supabase.from('time_block_groups').update(rest).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_block_groups', who] }),
  })
}

export function useDeleteGroup() {
  const qc = useQueryClient(); const who = useIdentity()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('time_block_groups').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time_block_groups', who] })
      // blocks.group_id는 on delete set null → 블럭은 '일반 블럭'으로 내려간다
      qc.invalidateQueries({ queryKey: ['time_blocks', who] })
    },
  })
}

export function useReorderGroups() {
  const qc = useQueryClient(); const who = useIdentity()
  return useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      await Promise.all(updates.map(({ id, sort_order }) =>
        supabase.from('time_block_groups').update({ sort_order }).eq('id', id)
          .then(({ error }) => { if (error) throw error })))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_block_groups', who] }),
  })
}

export function useAddBlock() {
  const qc = useQueryClient(); const who = useIdentity()
  return useMutation({
    mutationFn: async (b: { name: string; icon: string; color: string | null; group_id: string | null; sort_order: number }) => {
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
