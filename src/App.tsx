import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ensureSignedIn } from '@/lib/supabase'
import { getIdentity, isPinOk } from '@/lib/identity'
import type { Role } from '@/types'
import PinGate from '@/screens/PinGate'
import IdentityPick from '@/screens/IdentityPick'
import HomeScreen from '@/screens/HomeScreen'
import LedgerScreen from '@/screens/LedgerScreen'
import BusinessScreen from '@/screens/BusinessScreen'
import SettingsScreen from '@/screens/SettingsScreen'
import BottomNav from '@/components/BottomNav'
import { useRealtime } from '@/hooks/useRealtime'

const IdentityCtx = createContext<Role>('husband')
export const useIdentity = () => useContext(IdentityCtx)

export default function App() {
  const [ready, setReady] = useState(false)
  const [pinOk, setPinOkState] = useState(isPinOk())
  const [who, setWho] = useState<Role | null>(getIdentity())

  useEffect(() => { ensureSignedIn().then(() => setReady(true)).catch(() => setReady(true)) }, [])

  if (!ready) return <div className="p-6 text-sub">시작하는 중…</div>
  if (!pinOk) return <PinGate onOk={() => setPinOkState(true)} />
  if (!who) return <IdentityPick onPick={setWho} />

  return (
    <IdentityCtx.Provider value={who}>
      <Shell>
        <div className="max-w-md mx-auto min-h-full pb-20">
          <Routes>
            <Route path="/" element={<HomeScreen />} />
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
