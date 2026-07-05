import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useRealtime() {
  const qc = useQueryClient()
  useEffect(() => {
    const ch = supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' },
        () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['fund-data'] }) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' },
        () => qc.invalidateQueries({ queryKey: ['categories'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_methods' },
        () => qc.invalidateQueries({ queryKey: ['payment_methods'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets' },
        () => qc.invalidateQueries({ queryKey: ['budgets'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fixed_costs' },
        () => qc.invalidateQueries({ queryKey: ['fixed_costs'] }))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [qc])
}
