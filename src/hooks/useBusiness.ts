import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { monthKey } from '@/lib/date'
import type { Category, Transaction } from '@/types'

// 사업 카테고리
export function useBusinessCategories() {
  return useQuery({
    queryKey: ['categories', 'business'],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase.from('categories')
        .select('*').eq('scope', 'business').order('type').order('sort_order')
      if (error) throw error
      return data as Category[]
    },
  })
}

// 사업 월별 내역
export function useBusinessTransactions(year: number, month: number) {
  return useQuery({
    queryKey: ['transactions', 'business', monthKey(year, month)],
    queryFn: async (): Promise<Transaction[]> => {
      const prefix = monthKey(year, month)
      const { data, error } = await supabase.from('transactions')
        .select('*').eq('scope', 'business')
        .gte('date', `${prefix}-01`).lte('date', `${prefix}-31`)
        .order('date', { ascending: false }).order('created_at', { ascending: false })
      if (error) throw error
      return data as Transaction[]
    },
  })
}

// 사업자금 계산용 전체기간 데이터 (이체 + 사업 거래)
export function useFundData() {
  return useQuery({
    queryKey: ['fund-data'],
    queryFn: async () => {
      const [transfers, business] = await Promise.all([
        supabase.from('transactions').select('*, categories!inner(is_fund_transfer)')
          .eq('scope', 'household').eq('categories.is_fund_transfer', true),
        supabase.from('transactions').select('*').eq('scope', 'business'),
      ])
      if (transfers.error) throw transfers.error
      if (business.error) throw business.error
      return {
        transfers: (transfers.data ?? []) as unknown as Transaction[],
        business: (business.data ?? []) as Transaction[],
      }
    },
  })
}

// 사업자금이체 카테고리 id
export function useTransferCategoryId() {
  return useQuery({
    queryKey: ['transfer-cat-id'],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.from('categories')
        .select('id').eq('is_fund_transfer', true).limit(1).maybeSingle()
      if (error) throw error
      return data?.id ?? null
    },
  })
}

export type NewBizTx = Omit<Transaction, 'id' | 'created_at'>

export function useAddBusinessTx() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (t: NewBizTx) => {
      const { error } = await supabase.from('transactions').insert({ ...t, scope: 'business' })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['fund-data'] }) },
  })
}

export function useUpdateBusinessTx() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (t: Partial<Transaction> & { id: string }) => {
      const { id, ...rest } = t
      const { error } = await supabase.from('transactions').update(rest).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['fund-data'] }) },
  })
}

export function useDeleteBusinessTx() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['fund-data'] }) },
  })
}

// 이체: 가계 is_fund_transfer 거래 1건 생성
export function useFundTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { direction: 'to_business' | 'to_household'; amount: number; date: string; memo: string; who: 'husband' | 'wife'; transferCategoryId: string }) => {
      const { error } = await supabase.from('transactions').insert({
        who: p.who,
        type: p.direction === 'to_business' ? 'expense' : 'income',
        amount: p.amount,
        category_id: p.transferCategoryId,
        payment_method_id: null,
        date: p.date,
        memo: p.memo || (p.direction === 'to_business' ? '사업자금 보내기' : '사업자금 받기'),
        scope: 'household',
      })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['fund-data'] }) },
  })
}
