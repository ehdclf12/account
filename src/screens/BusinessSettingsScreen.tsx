import { useState } from 'react'
import { useAddCategory, useDeleteCategory } from '@/hooks/useCategories'
import { useBusinessCategories } from '@/hooks/useBusiness'
import NavButton from '@/components/NavButton'
import type { TxType } from '@/types'

export default function BusinessSettingsScreen() {
  const { data: bizCats = [] } = useBusinessCategories()
  const addCat = useAddCategory(); const delCat = useDeleteCategory()
  const [bizCatName, setBizCatName] = useState('')
  const [bizCatType, setBizCatType] = useState<TxType>('expense')

  return (
    <div className="p-5 space-y-8">
      <NavButton to="/business" label="코스모스" />
      <h1 className="text-xl font-bold text-ink">코스모스 설정</h1>

      <section>
        <p className="font-bold text-ink mb-2">사업 카테고리</p>
        <div className="space-y-1 mb-3">
          {bizCats.map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-sm">
              <span className="text-ink">{c.name}</span>
              <span className="text-sub text-xs">{c.type === 'income' ? '수입' : '지출'}</span>
              <button onClick={() => delCat.mutate(c.id)} className="ml-auto text-sub text-xs">삭제</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={bizCatName} onChange={(e) => setBizCatName(e.target.value)} placeholder="이름" className="flex-1 bg-card rounded-xl px-3 py-2 outline-none" />
          <select value={bizCatType} onChange={(e) => setBizCatType(e.target.value as TxType)} className="bg-card rounded-xl px-2 outline-none">
            <option value="expense">지출</option><option value="income">수입</option>
          </select>
          <button className="bg-brand text-white rounded-xl px-3 font-semibold"
            onClick={() => { if (bizCatName) { addCat.mutate({ name: bizCatName, icon: '', type: bizCatType, is_fixed: false, sort_order: 99, scope: 'business', is_fund_transfer: false, is_savings: false }); setBizCatName('') } }}>
            추가
          </button>
        </div>
      </section>
    </div>
  )
}
