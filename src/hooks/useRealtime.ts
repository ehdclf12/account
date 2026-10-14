import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useRealtime() {
  const qc = useQueryClient()
  useEffect(() => {
    const ch = supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'archive_folders' },
        () => qc.invalidateQueries({ queryKey: ['folders'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'archive_items' },
        () => qc.invalidateQueries({ queryKey: ['archive_items'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_blocks' },
        () => qc.invalidateQueries({ queryKey: ['time_blocks'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_sessions' },
        () => qc.invalidateQueries({ queryKey: ['time_sessions'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_goals' },
        () => qc.invalidateQueries({ queryKey: ['time_goals'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_quotes' },
        () => qc.invalidateQueries({ queryKey: ['time_quote'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_programs' },
        () => qc.invalidateQueries({ queryKey: ['workout_program'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_logs' },
        () => qc.invalidateQueries({ queryKey: ['workout_logs'] }))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [qc])
}
