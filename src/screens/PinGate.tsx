import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { hashPin } from '@/lib/pin'
import { setPinOk } from '@/lib/identity'

export default function PinGate({ onOk }: { onOk: () => void }) {
  const [hasPin, setHasPin] = useState<boolean | null>(null)
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    supabase.from('app_settings').select('pin_hash').eq('id', 1).single()
      .then(({ data }) => setHasPin(!!data?.pin_hash))
  }, [])

  async function submit() {
    if (pin.length !== 4) { setErr('4자리를 입력하세요'); return }
    const h = await hashPin(pin)
    if (hasPin) {
      const { data } = await supabase.from('app_settings').select('pin_hash').eq('id', 1).single()
      if (data?.pin_hash === h) { setPinOk(true); onOk() }
      else { setErr('PIN이 맞지 않아요'); setPin('') }
    } else {
      const { error } = await supabase.from('app_settings').update({ pin_hash: h }).eq('id', 1)
      if (error) { setErr('저장 실패'); return }
      setPinOk(true); onOk()
    }
  }

  if (hasPin === null) return <div className="p-6 text-sub">불러오는 중…</div>

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
      <h1 className="text-2xl font-bold">{hasPin ? 'PIN 입력' : '새 PIN 설정 (4자리)'}</h1>
      <input
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
        inputMode="numeric" type="password"
        className="text-center text-3xl tracking-[1rem] w-48 border-b-2 border-brand py-2 outline-none"
        placeholder="••••" autoFocus
      />
      {err && <p className="text-red-500 text-sm">{err}</p>}
      <button onClick={submit} className="bg-brand text-white rounded-2xl px-8 py-3 font-bold w-full max-w-xs">
        확인
      </button>
    </div>
  )
}
