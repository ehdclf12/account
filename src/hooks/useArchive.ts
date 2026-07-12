import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ArchiveFolder, ArchiveItem, LinkPreview } from '@/types'
import { storagePathFromPublicUrl } from '@/lib/archive'

export function useFolders() {
  return useQuery({
    queryKey: ['folders'],
    queryFn: async (): Promise<ArchiveFolder[]> => {
      const { data, error } = await supabase.from('archive_folders')
        .select('*').order('sort_order').order('created_at')
      if (error) throw error
      return data as ArchiveFolder[]
    },
  })
}

export function useArchiveItems() {
  return useQuery({
    queryKey: ['archive_items'],
    queryFn: async (): Promise<ArchiveItem[]> => {
      const { data, error } = await supabase.from('archive_items')
        .select('*').order('updated_at', { ascending: false })
      if (error) throw error
      return data as ArchiveItem[]
    },
  })
}

export function useAddFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (f: { name: string; sort_order: number; parent_id: string | null }) => {
      const { error } = await supabase.from('archive_folders').insert(f)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }),
  })
}

export function useUpdateFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('archive_folders').update({ name }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }),
  })
}

export function useDeleteFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('archive_folders').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folders'] })
      qc.invalidateQueries({ queryKey: ['archive_items'] }) // on delete set null 반영
    },
  })
}

export function useReorderFolders() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      await Promise.all(updates.map(({ id, sort_order }) =>
        supabase.from('archive_folders').update({ sort_order }).eq('id', id)
          .then(({ error }) => { if (error) throw error })))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }),
  })
}

export function useAddItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (it: Omit<ArchiveItem, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase.from('archive_items').insert(it)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['archive_items'] }),
  })
}

export function useUpdateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (it: Partial<ArchiveItem> & { id: string }) => {
      const { id, ...rest } = it
      const { error } = await supabase.from('archive_items')
        .update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['archive_items'] }),
  })
}

export function useDeleteItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: Pick<ArchiveItem, 'id' | 'kind' | 'url'>) => {
      const { error } = await supabase.from('archive_items').delete().eq('id', item.id)
      if (error) throw error
      if (item.kind === 'image' && item.url) {
        const path = storagePathFromPublicUrl(item.url)
        if (path) await supabase.storage.from('archive').remove([path])
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['archive_items'] }),
  })
}

export function useToggleCheck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ item, index }: { item: ArchiveItem; index: number }) => {
      const list = (item.checklist ?? []).map((c, i) =>
        i === index ? { ...c, done: !c.done } : c)
      // 체크 토글은 updated_at을 갱신하지 않는다: 목록이 updated_at desc 정렬이라
      // 체크할 때마다 카드가 최상단으로 튀는 것을 막기 위함(실제 편집은 계속 최신순 반영).
      const { error } = await supabase.from('archive_items')
        .update({ checklist: list }).eq('id', item.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['archive_items'] }),
  })
}

export async function uploadArchiveImage(file: File): Promise<string> {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('archive').upload(path, file, { upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('archive').getPublicUrl(path)
  return data.publicUrl
}

export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  try {
    const res = await fetch(`/api/preview?url=${encodeURIComponent(url)}`)
    if (!res.ok) return null
    const j = await res.json()
    if (!j || (!j.title && !j.image && !j.description)) return null
    return {
      title: j.title || '', description: j.description || '',
      image: j.image || '', site: j.site || '',
    }
  } catch {
    return null
  }
}
