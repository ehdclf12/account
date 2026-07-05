import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { monthKey } from '@/lib/date'
import type { Transaction } from '@/types'

export type NewTx = Omit<Transaction, 'id' | 'created_at'>

const monthQueryKey = (y: number, m: number) => ['transactions', monthKey(y, m)]

export function useTransactions(year: number, month: number) {
  return useQuery({
    queryKey: monthQueryKey(year, month),
    queryFn: async (): Promise<Transaction[]> => {
      const prefix = monthKey(year, month)
      const { data, error } = await supabase.from('transactions')
        .select('*')
        .eq('scope', 'household')
        .gte('date', `${prefix}-01`)
        .lte('date', `${prefix}-31`)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Transaction[]
    },
  })
}

export function useAddTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (t: NewTx) => {
      const { error } = await supabase.from('transactions').insert(t)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (t: Partial<Transaction> & { id: string }) => {
      const { id, ...rest } = t
      const { error } = await supabase.from('transactions').update(rest).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })
}
