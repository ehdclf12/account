import type { Role } from '@/types'

const STYLE = {
  husband: 'bg-[#E8F3FF] text-[#3182F6]',
  wife: 'bg-[#FBEEF0] text-[#F04452]',
} as const
const LABEL = { husband: '남편', wife: '아내' } as const

export default function WhoBadge({ who }: { who: Role }) {
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold ${STYLE[who]}`}>
      {LABEL[who]}
    </span>
  )
}
