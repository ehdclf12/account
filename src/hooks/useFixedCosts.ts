import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { FixedCost, Scope, Role } from '@/types'

export function useFixedCosts(scope: Scope) {
  return useQuery({
    queryKey: ['fixed_costs', scope],
    queryFn: async (): Promise<FixedCost[]> => {
      const { data, error } = await supabase.from('fixed_costs')
        .select('*').eq('scope', scope).eq('active', true).order('day')
      if (error) throw error
      return data as FixedCost[]
    },
  })
}

export function useAddFixedCost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (f: Omit<FixedCost, 'id'>) => {
      const { error } = await supabase.from('fixed_costs').insert(f)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fixed_costs'] }),
  })
}

export function useUpdateFixedCost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (f: Partial<FixedCost> & { id: string }) => {
      const { id, ...rest } = f
      const { error } = await supabase.from('fixed_costs').update(rest).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fixed_costs'] }),
  })
}

export function useDeleteFixedCost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fixed_costs').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fixed_costs'] }),
  })
}

export function useRegisterFixedCost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (t: {
      who: Role; scope: Scope; type: 'expense'; amount: number; category_id: string | null;
      payment_method_id: null; date: string; memo: string; fixed_cost_id: string
    }) => {
      const { error } = await supabase.from('transactions').insert(t)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['fund-data'] })
    },
  })
}
