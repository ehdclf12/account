import { useNavigate } from 'react-router-dom'
import { useIdentity } from '@/App'
import { NAME_BY_ROLE } from '@/lib/users'
import { supabase } from '@/lib/supabase'
import { MENU } from '@/lib/menu'

// 각 화면의 Home 버튼이 오는 메뉴 목록. 대시보드 이전의 첫 화면을 되살렸다.
export default function MenuScreen() {
  const nav = useNavigate()
  const who = useIdentity()
  return (
    <div className="p-5 min-h-[85vh] flex flex-col">
      <h1 className="text-xl font-bold text-ink mb-5">우리집</h1>
      <div className="space-y-3">
        {MENU.map((m) => (
          <button key={m.to} onClick={() => nav(m.to)}
            className="w-full text-left bg-card rounded-2xl p-5 active:opacity-70 flex justify-between items-center">
            <div>
              <span className="font-bold text-ink text-lg">{m.label}</span>
              <p className="text-sub text-sm mt-1">{m.desc}</p>
            </div>
            <span className="text-sub text-xl">›</span>
          </button>
        ))}
      </div>
      <div className="mt-auto pt-8">
        <span className="text-sm text-sub">
          {NAME_BY_ROLE[who]}님 · <button onClick={() => supabase.auth.signOut()} className="text-brand font-medium">Logout</button>
        </span>
      </div>
    </div>
  )
}
