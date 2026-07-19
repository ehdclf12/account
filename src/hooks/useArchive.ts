import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ArchiveFolder, ArchiveItem, LinkPreview } from '@/types'
import { storagePathFromPublicUrl, applyChecklistToggle } from '@/lib/archive'

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
        // 스토리지 정리는 DB 삭제의 실패 경로에 두지 않는다. 여기서 throw하면
        // onSuccess가 안 뛰어 캐시가 남고, 행은 지워졌는데 화면엔 계속 보인다.
        if (path) {
          const { error: rmError } = await supabase.storage.from('archive').remove([path])
          if (rmError) console.warn('archive 이미지 정리 실패(행은 삭제됨):', rmError.message)
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['archive_items'] }),
  })
}

export function useToggleCheck() {
  const qc = useQueryClient()
  return useMutation({
    // 토글을 onMutate에서 "현재 캐시" 기준으로 즉시 반영하고, mutationFn은 그
    // 결과를 저장만 한다. 렌더 시점 스냅샷으로 배열 전체를 덮어쓰면 연속 탭
    // 시 앞선 체크가 되돌아간다(갱신 유실).
    onMutate: async ({ item, index }: { item: ArchiveItem; index: number }) => {
      await qc.cancelQueries({ queryKey: ['archive_items'] })
      const prev = qc.getQueryData<ArchiveItem[]>(['archive_items'])
      qc.setQueryData<ArchiveItem[]>(['archive_items'], (old) =>
        applyChecklistToggle(old ?? [], item.id, index))
      return { prev }
    },
    mutationFn: async ({ item }: { item: ArchiveItem; index: number }) => {
      const list = qc.getQueryData<ArchiveItem[]>(['archive_items'])
        ?.find((i) => i.id === item.id)?.checklist ?? []
      // 체크 토글은 updated_at을 갱신하지 않는다: 목록이 updated_at desc 정렬이라
      // 체크할 때마다 카드가 최상단으로 튀는 것을 막기 위함(실제 편집은 계속 최신순 반영).
      const { error } = await supabase.from('archive_items')
        .update({ checklist: list }).eq('id', item.id)
      if (error) throw error
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['archive_items'], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['archive_items'] }),
  })
}

export function useToggleDone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      // 체크 토글과 동일하게 updated_at을 건드리지 않는다(완료했다고 카드가 최상단으로 튀지 않도록)
      const { error } = await supabase.from('archive_items').update({ done }).eq('id', id)
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
