import { useQueries } from '@tanstack/react-query'
import type { HolidayMap } from '@/lib/holidays'

const DAY_MS = 86_400_000
const cacheKey = (year: number) => `holidays_${year}`

function readCache(year: number): HolidayMap | undefined {
  try {
    const raw = localStorage.getItem(cacheKey(year))
    if (!raw) return undefined
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

/**
 * 격자에 등장하는 연도들의 공휴일을 하나의 맵으로 합쳐 돌려준다.
 * 격자가 42칸이라 연말·연초에는 두 해가 걸친다.
 *
 * 실패해도 던지지 않는다 — 공휴일이 안 보일 뿐 캘린더는 정상 동작해야 한다.
 */
export function useHolidays(years: number[]): HolidayMap {
  const results = useQueries({
    queries: years.map((year) => ({
      queryKey: ['holidays', year],
      queryFn: async (): Promise<HolidayMap> => {
        const res = await fetch(`/api/holidays?year=${year}`)
        if (!res.ok) throw new Error(`holidays ${res.status}`)
        const json: unknown = await res.json()
        const map = json && typeof json === 'object' && !Array.isArray(json)
          ? (json as HolidayMap)
          : {}
        // 빈 결과는 저장하지 않는다. 일시적 장애를 영구 캐시로 굳히지 않기 위함.
        if (Object.keys(map).length > 0) {
          try { localStorage.setItem(cacheKey(year), JSON.stringify(map)) } catch { /* 용량 초과 등 무시 */ }
        }
        return map
      },
      // 확정된 공휴일은 바뀌지 않으므로 캐시된 해는 다시 받지 않는다
      initialData: () => readCache(year),
      staleTime: DAY_MS,
      gcTime: 7 * DAY_MS,
      retry: 1,
    })),
  })

  return Object.assign({}, ...results.map((r) => r.data ?? {})) as HolidayMap
}
