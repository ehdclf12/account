import { formatKRW } from '@/lib/format'
import type { TxType } from '@/types'

export default function AmountText({ amount, type }: { amount: number; type: TxType }) {
  const income = type === 'income'
  return (
    <span className={income ? 'text-brand font-bold' : 'text-ink font-bold'}>
      {income ? '+' : '-'}{formatKRW(amount)}
    </span>
  )
}
