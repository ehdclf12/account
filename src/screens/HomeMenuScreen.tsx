import { useNavigate } from 'react-router-dom'
import { useIdentity } from '@/App'
import { NAME_BY_ROLE } from '@/lib/users'
import { supabase } from '@/lib/supabase'

export default function HomeMenuScreen() {
  const nav = useNavigate()
  const who = useIdentity()
  return (
    <div className="p-5 min-h-[85vh] flex flex-col">
      <h1 className="text-xl font-bold text-ink mb-5">우리집</h1>
      <div className="space-y-3">
        <button onClick={() => nav('/budget')}
          className="w-full text-left bg-card rounded-2xl p-5 active:opacity-70 flex justify-between items-center">
          <div>
            <span className="font-bold text-ink text-lg">예산관리</span>
            <p className="text-sub text-sm mt-1">집 · 코스모스 가계부</p>
          </div>
          <span className="text-sub text-xl">›</span>
        </button>
      </div>
      <div className="mt-auto pt-8 text-sm text-sub">
        {NAME_BY_ROLE[who]}님 · <button onClick={() => supabase.auth.signOut()} className="text-brand font-medium">로그아웃</button>
      </div>
    </div>
  )
}
