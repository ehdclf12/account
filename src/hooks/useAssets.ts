import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Asset } from '@/types'

export function useAssets() {
  return useQuery({
    queryKey: ['assets'],
    queryFn: async (): Promise<Asset[]> => {
      const { data, error } = await supabase.from('assets')
        .select('*').eq('active', true).order('created_at')
      if (error) throw error
      return data as Asset[]
    },
  })
}

export function useAddAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (a: Omit<Asset, 'id' | 'created_at'>) => {
      const { error } = await supabase.from('assets').insert(a)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  })
}

export function useUpdateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (a: Partial<Asset> & { id: string }) => {
      const { id, ...rest } = a
      const { error } = await supabase.from('assets').update(rest).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  })
}

export function useDeleteAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('assets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  })
}
