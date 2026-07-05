import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Category } from '@/types'

const KEY = ['categories']

export function useCategories() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase.from('categories')
        .select('*').order('type').order('sort_order')
      if (error) throw error
      return data as Category[]
    },
  })
}

export function useAddCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (c: Omit<Category, 'id'>) => {
      const { error } = await supabase.from('categories').insert(c)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (c: Partial<Category> & { id: string }) => {
      const { id, ...rest } = c
      const { error } = await supabase.from('categories').update(rest).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
