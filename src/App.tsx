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

const HubScreen = lazy(() => import('@/screens/HubScreen'))
const HomeScreen = lazy(() => import('@/screens/HomeScreen'))
const HouseholdSettingsScreen = lazy(() => import('@/screens/HouseholdSettingsScreen'))
const LedgerScreen = lazy(() => import('@/screens/LedgerScreen'))
const BusinessScreen = lazy(() => import('@/screens/BusinessScreen'))
const BusinessCalculatorScreen = lazy(() => import('@/screens/BusinessCalculatorScreen'))
const BusinessSettingsScreen = lazy(() => import('@/screens/BusinessSettingsScreen'))
const BudgetEditScreen = lazy(() => import('@/screens/BudgetEditScreen'))
const StatsScreen = lazy(() => import('@/screens/StatsScreen'))
const FixedManageScreen = lazy(() => import('@/screens/FixedManageScreen'))
const SavingsManageScreen = lazy(() => import('@/screens/SavingsManageScreen'))
const AssetsScreen = lazy(() => import('@/screens/AssetsScreen'))
const ArchiveScreen = lazy(() => import('@/screens/ArchiveScreen'))
const CalendarScreen = lazy(() => import('@/screens/CalendarScreen'))
const TimeScreen = lazy(() => import('@/screens/TimeScreen'))

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

  return (
    <IdentityCtx.Provider value={info.role}>
      <Shell>
        <div className={`${wide ? 'max-w-2xl' : 'max-w-md'} mx-auto min-h-full pb-8`}>
          <Suspense fallback={<ScreenFallback />}>
            <Routes>
              <Route path="/" element={<HomeMenuScreen />} />
              <Route path="/calendar" element={<CalendarScreen />} />
              <Route path="/time" element={<TimeScreen />} />
              <Route path="/budget" element={<HubScreen />} />
              <Route path="/assets" element={<AssetsScreen />} />
              <Route path="/archive" element={<ArchiveScreen />} />
              <Route path="/household" element={<HomeScreen />} />
              <Route path="/household/manage" element={<HouseholdSettingsScreen />} />
              <Route path="/household/budget" element={<BudgetEditScreen scope="household" backTo="/household" />} />
              <Route path="/household/stats" element={<StatsScreen scope="household" backTo="/household" />} />
              <Route path="/household/fixed" element={<FixedManageScreen scope="household" backTo="/household" />} />
              <Route path="/household/savings" element={<SavingsManageScreen />} />
              <Route path="/business/fixed" element={<FixedManageScreen scope="business" backTo="/business" />} />
              <Route path="/ledger" element={<LedgerScreen />} />
              <Route path="/business" element={<BusinessScreen />} />
              <Route path="/business/calculator" element={<BusinessCalculatorScreen />} />
              <Route path="/business/manage" element={<BusinessSettingsScreen />} />
              <Route path="/business/budget" element={<BudgetEditScreen scope="business" backTo="/business" />} />
              <Route path="/business/stats" element={<StatsScreen scope="business" backTo="/business" />} />
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
