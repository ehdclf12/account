import { createContext, lazy, Suspense, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { userForEmail } from '@/lib/users'
import type { Role } from '@/types'
import { useRealtime } from '@/hooks/useRealtime'
import Toaster from '@/components/Toaster'

// Login과 HomeMenuScreen은 첫 화면이라 즉시 필요하다. 나머지는 라우트별로
// 쪼개서 실제로 그 화면에 들어갈 때 받는다.
import Login from '@/screens/Login'
import HomeMenuScreen from '@/screens/HomeMenuScreen'

const ArchiveScreen = lazy(() => import('@/screens/ArchiveScreen'))
const CalendarScreen = lazy(() => import('@/screens/CalendarScreen'))
const TimeScreen = lazy(() => import('@/screens/TimeScreen'))
const WorkoutScreen = lazy(() => import('@/screens/WorkoutScreen'))

const IdentityCtx = createContext<Role>('husband')
export const useIdentity = () => useContext(IdentityCtx)

export default function App() {
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const { pathname } = useLocation()

  if (!ready) return <div className="p-6 text-sub">시작하는 중…</div>
  if (!email) return <Login />

  const info = userForEmail(email)
  if (!info) return (
    <div className="p-6 text-sub">
      등록되지 않은 계정이에요.
      <button onClick={() => supabase.auth.signOut()} className="block mt-3 text-brand">Logout</button>
    </div>
  )

  const wide = pathname === '/calendar'
  const home = pathname === '/'

  return (
    <IdentityCtx.Provider value={info.role}>
      <Shell>
        {/* 홈(성운 대시보드)은 폭 제한 없이 화면 전체를 쓴다 */}
        <div className={home ? 'w-full min-h-full' : `${wide ? 'max-w-2xl' : 'max-w-md'} mx-auto min-h-full pb-8`}>
          <Suspense fallback={<ScreenFallback />}>
            <Routes>
              <Route path="/" element={<HomeMenuScreen />} />
              <Route path="/calendar" element={<CalendarScreen />} />
              <Route path="/time" element={<TimeScreen />} />
              <Route path="/workout" element={<WorkoutScreen />} />
              <Route path="/archive" element={<ArchiveScreen />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </div>
      </Shell>
    </IdentityCtx.Provider>
  )
}

// 화면 청크를 받는 동안 잠깐 보이는 자리. 캐시된 뒤에는 거의 나타나지 않는다.
function ScreenFallback() {
  return <div className="p-6 text-sub">불러오는 중…</div>
}

function Shell({ children }: { children: ReactNode }) {
  useRealtime()
  return <>{children}<Toaster /></>
}
