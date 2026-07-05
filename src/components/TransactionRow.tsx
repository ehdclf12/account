import type { Transaction, Category } from '@/types'
import AmountText from './AmountText'
import WhoBadge from './WhoBadge'

export default function TransactionRow(
  { tx, category, onClick }: { tx: Transaction; category?: Category; onClick?: () => void },
) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 py-3.5 text-left">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-ink truncate">
          {tx.memo || category?.name || '기타'}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <WhoBadge who={tx.who} />
          <span className="text-xs text-sub">{category?.name ?? '기타'}</span>
        </div>
      </div>
      <AmountText amount={tx.amount} type={tx.type} />
    </button>
  )
}
