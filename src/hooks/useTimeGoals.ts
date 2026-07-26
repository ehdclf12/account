import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useIdentity } from '@/App'
import type { ChecklistEntry, TimeGoal } from '@/types'

export function useTimeGoals() {
  const who = useIdentity()
  return useQuery({
    queryKey: ['time_goals', who],
    queryFn: async (): Promise<TimeGoal[]> => {
      const { data, error } = await supabase.from('time_goals')
        .select('*').eq('who', who)
        .order('sort_order').order('created_at')
      if (error) throw error
      return data as TimeGoal[]
    },
  })
}

export function useAddGoal() {
  const qc = useQueryClient(); const who = useIdentity()
  return useMutation({
    mutationFn: async (g: { title: string; sort_order: number }) => {
      const { error } = await supabase.from('time_goals').insert({ ...g, who, checklist: [] })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_goals', who] }),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient(); const who = useIdentity()
  return useMutation({
    mutationFn: async (
      { id, ...rest }: { id: string; title?: string; checklist?: ChecklistEntry[]; sort_order?: number },
    ) => {
      const { error } = await supabase.from('time_goals').update(rest).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_goals', who] }),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient(); const who = useIdentity()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('time_goals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_goals', who] }),
  })
}

export function useQuote() {
  const who = useIdentity()
  return useQuery({
    queryKey: ['time_quote', who],
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase.from('time_quotes')
        .select('text').eq('who', who).maybeSingle()
      if (error) throw error
      return (data?.text as string | undefined) ?? ''
    },
  })
}

export function useSetQuote() {
  const qc = useQueryClient(); const who = useIdentity()
  return useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase.from('time_quotes')
        .upsert({ who, text, updated_at: new Date().toISOString() }, { onConflict: 'who' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time_quote', who] }),
  })
}
