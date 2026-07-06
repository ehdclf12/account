import { useQuery } from '@tanstack/react-query'
import type { Quote } from '@/lib/quote'

export interface QuotesData { quotes: Record<string, Quote>; usdkrw: number | null }

export function useQuotes(symbols: string[]) {
  const key = [...symbols].sort().join(',')
  return useQuery({
    queryKey: ['quotes', key],
    enabled: symbols.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<QuotesData> => {
      const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(key)}`)
      if (!res.ok) throw new Error('quotes fetch failed')
      return res.json() as Promise<QuotesData>
    },
  })
}
