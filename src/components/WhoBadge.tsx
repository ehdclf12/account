import type { Role } from '@/types'
import { NAME_BY_ROLE } from '@/lib/users'

const STYLE = {
  husband: 'bg-brand/10 text-brand',
  wife: 'bg-danger/10 text-danger',
} as const

export default function WhoBadge({ who }: { who: Role }) {
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold ${STYLE[who]}`}>
      {NAME_BY_ROLE[who]}
    </span>
  )
}
