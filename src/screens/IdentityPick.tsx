import { setIdentity } from '@/lib/identity'
import type { Role } from '@/types'

export default function IdentityPick({ onPick }: { onPick: (r: Role) => void }) {
  function pick(r: Role) { setIdentity(r); onPick(r) }
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
      <h1 className="text-2xl font-bold text-ink">나는 누구인가요?</h1>
      <div className="flex gap-4 w-full max-w-xs">
        <button onClick={() => pick('husband')} className="flex-1 bg-card rounded-2xl py-8 text-lg font-bold text-ink">
          남편
        </button>
        <button onClick={() => pick('wife')} className="flex-1 bg-card rounded-2xl py-8 text-lg font-bold text-ink">
          아내
        </button>
      </div>
    </div>
  )
}
