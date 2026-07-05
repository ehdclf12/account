import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Budget } from '@/types'

export function useBudgets(month: string) {
  return useQuery({
    queryKey: ['budgets', month],
    queryFn: async (): Promise<Budget[]> => {
      const { data, error } = await supabase.from('budgets').select('*').eq('month', month)
      if (error) throw error
      return data as Budget[]
    },
  })
}

export function useSetBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (b: { category_id: string; month: string; amount: number }) => {
      const { error } = await supabase.from('budgets').upsert(b, { onConflict: 'category_id,month' })
      if (error) throw error
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['budgets', v.month] }),
  })
}
