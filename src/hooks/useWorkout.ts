import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useIdentity } from '@/App'
import type { Program, Settings, WorkoutLog, SetEntry } from '@/engine/workout/types'

export interface WorkoutProgramData { settings: Settings; program: Program }

interface LogRow { id: string; date: string; session_id: string; sets: SetEntry[] }

export function rowToLog(r: LogRow): WorkoutLog {
  return { id: r.id, date: r.date, sessionId: r.session_id, sets: r.sets ?? [] }
}

export function useWorkoutProgram() {
  const who = useIdentity()
  return useQuery({
    queryKey: ['workout_program', who],
    queryFn: async (): Promise<WorkoutProgramData | null> => {
      const { data, error } = await supabase.from('workout_programs')
        .select('settings, program').eq('who', who).maybeSingle()
      if (error) throw error
      return data ? { settings: data.settings as Settings, program: data.program as Program } : null
    },
  })
}

export function useSaveProgram() {
  const qc = useQueryClient(); const who = useIdentity()
  return useMutation({
    mutationFn: async (v: WorkoutProgramData) => {
      const { error } = await supabase.from('workout_programs').upsert(
        { who, settings: v.settings, program: v.program, updated_at: new Date().toISOString() },
        { onConflict: 'who' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout_program', who] }),
  })
}

export function useWorkoutLogs() {
  const who = useIdentity()
  return useQuery({
    queryKey: ['workout_logs', who],
    queryFn: async (): Promise<WorkoutLog[]> => {
      const { data, error } = await supabase.from('workout_logs')
        .select('id, date, session_id, sets').eq('who', who).order('date', { ascending: false })
      if (error) throw error
      return (data as LogRow[]).map(rowToLog)
    },
  })
}

/** 날짜당 한 행(upsert). 낙관적 반영 후 실패하면 이전 캐시(서버 값)로 되돌린다. */
export function useSaveLog() {
  const qc = useQueryClient(); const who = useIdentity()
  const key = ['workout_logs', who]
  return useMutation({
    onMutate: async (log: WorkoutLog) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<WorkoutLog[]>(key)
      qc.setQueryData<WorkoutLog[]>(key, (old = []) => {
        const rest = old.filter((l) => l.date !== log.date)
        const existing = old.find((l) => l.date === log.date)
        return [{ ...log, id: log.id ?? existing?.id }, ...rest].sort((a, b) => b.date.localeCompare(a.date))
      })
      return { prev }
    },
    mutationFn: async (log: WorkoutLog) => {
      const { error } = await supabase.from('workout_logs').upsert(
        { who, date: log.date, session_id: log.sessionId, sets: log.sets, updated_at: new Date().toISOString() },
        { onConflict: 'who,date' })
      if (error) throw error
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })
}
