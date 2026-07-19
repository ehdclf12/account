import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PaymentMethod } from '@/types'

const KEY = ['payment_methods']

export function usePaymentMethods() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<PaymentMethod[]> => {
      const { data, error } = await supabase.from('payment_methods')
        .select('*').order('sort_order')
      if (error) throw error
      return data as PaymentMethod[]
    },
  })
}

export function useAddPaymentMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: Omit<PaymentMethod, 'id'>) => {
      const { error } = await supabase.from('payment_methods').insert(p)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeletePaymentMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payment_methods').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      // transactions.payment_method_id on delete set null
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}
