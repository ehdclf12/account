import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { SavingsGoal } from '@/types'

export function useSavingsGoals() {
  return useQuery({
    queryKey: ['savings_goals'],
    queryFn: async (): Promise<SavingsGoal[]> => {
      const { data, error } = await supabase.from('savings_goals')
        .select('*').eq('active', true).order('created_at')
      if (error) throw error
      return data as SavingsGoal[]
    },
  })
}

export function useSavingsProgress() {
  return useQuery({
    queryKey: ['savings_progress'],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase.from('transactions')
        .select('savings_goal_id, amount').not('savings_goal_id', 'is', null)
      if (error) throw error
      const totals: Record<string, number> = {}
      for (const row of data as { savings_goal_id: string; amount: number }[]) {
        totals[row.savings_goal_id] = (totals[row.savings_goal_id] ?? 0) + row.amount
      }
      return totals
    },
  })
}

export function useAddSavingsGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (g: Omit<SavingsGoal, 'id' | 'created_at'>) => {
      const { error } = await supabase.from('savings_goals').insert(g)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savings_goals'] }),
  })
}

export function useUpdateSavingsGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (g: Partial<SavingsGoal> & { id: string }) => {
      const { id, ...rest } = g
      const { error } = await supabase.from('savings_goals').update(rest).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savings_goals'] }),
  })
}

export function useDeleteSavingsGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('savings_goals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      // 삭제 시 연결된 거래의 savings_goal_id가 null이 되므로 진행 합계·거래도 갱신
      qc.invalidateQueries({ queryKey: ['savings_goals'] })
      qc.invalidateQueries({ queryKey: ['savings_progress'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}
