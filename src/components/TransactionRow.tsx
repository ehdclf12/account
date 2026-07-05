import type { Transaction, Category } from '@/types'
import AmountText from './AmountText'

const WHO_LABEL = { husband: '남편', wife: '아내' } as const

export default function TransactionRow(
  { tx, category, onClick }: { tx: Transaction; category?: Category; onClick?: () => void },
) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 py-3 text-left">
      <span className="text-2xl">{category?.icon ?? '💸'}</span>
      <div className="flex-1">
        <div className="font-medium">{category?.name ?? '기타'}{tx.memo && <span className="text-sub font-normal"> · {tx.memo}</span>}</div>
        <div className="text-xs text-sub">{WHO_LABEL[tx.who]}</div>
      </div>
      <AmountText amount={tx.amount} type={tx.type} />
    </button>
  )
}
