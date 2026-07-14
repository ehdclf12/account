import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    setErr(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) setErr('이메일 또는 비밀번호가 맞지 않아요')
  }

  return (
    <div className="flex flex-col justify-center h-full gap-4 p-6 max-w-sm mx-auto w-full">
      <h1 className="text-2xl font-bold text-ink mb-2">우리집 가계부</h1>
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email"
        placeholder="이메일" autoCapitalize="none" autoCorrect="off"
        className="bg-card rounded-xl px-4 py-3 outline-none" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} type="password"
        placeholder="비밀번호" onKeyDown={(e) => e.key === 'Enter' && submit()}
        className="bg-card rounded-xl px-4 py-3 outline-none" />
      {err && <p className="text-danger text-sm">{err}</p>}
      <button onClick={submit} disabled={loading || !email || !password}
        className="bg-brand disabled:bg-sub text-white rounded-2xl py-3 font-bold mt-2">
        {loading ? '로그인 중…' : '로그인'}
      </button>
    </div>
  )
}
