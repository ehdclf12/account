import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { userForEmail } from '@/lib/users'
import type { Role } from '@/types'
import { useRealtime } from '@/hooks/useRealtime'
import Login from '@/screens/Login'
import HubScreen from '@/screens/HubScreen'
import HomeScreen from '@/screens/HomeScreen'
import LedgerScreen from '@/screens/LedgerScreen'
import BusinessScreen from '@/screens/BusinessScreen'
import SettingsScreen from '@/screens/SettingsScreen'
import BottomNav from '@/components/BottomNav'

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

  if (!ready) return <div className="p-6 text-sub">시작하는 중…</div>
  if (!email) return <Login />

  const info = userForEmail(email)
  if (!info) return (
    <div className="p-6 text-sub">
      등록되지 않은 계정이에요.
      <button onClick={() => supabase.auth.signOut()} className="block mt-3 text-brand">로그아웃</button>
    </div>
  )

  return (
    <IdentityCtx.Provider value={info.role}>
      <Shell>
        <div className="max-w-md mx-auto min-h-full pb-20">
          <Routes>
            <Route path="/" element={<HubScreen />} />
            <Route path="/household" element={<HomeScreen />} />
            <Route path="/ledger" element={<LedgerScreen />} />
            <Route path="/business" element={<BusinessScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          <BottomNav />
        </div>
      </Shell>
    </IdentityCtx.Provider>
  )
}

function Shell({ children }: { children: ReactNode }) {
  useRealtime()
  return <>{children}</>
}
