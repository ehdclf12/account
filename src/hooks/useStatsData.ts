import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Scope, Transaction } from '@/types'

export function useRangeTransactions(scope: Scope, fromDate: string, toExclusive: string) {
  return useQuery({
    queryKey: ['transactions', 'range', scope, fromDate, toExclusive],
    queryFn: async (): Promise<Transaction[]> => {
      const { data, error } = await supabase.from('transactions')
        .select('*').eq('scope', scope).gte('date', fromDate).lt('date', toExclusive)
      if (error) throw error
      return data as Transaction[]
    },
  })
}
