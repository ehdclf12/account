import { useState } from 'react'
import { useCategories, useAddCategory, useDeleteCategory } from '@/hooks/useCategories'
import { usePaymentMethods, useAddPaymentMethod, useDeletePaymentMethod } from '@/hooks/usePaymentMethods'
import NavButton from '@/components/NavButton'
import type { TxType } from '@/types'

export default function HouseholdSettingsScreen() {
  const { data: cats = [] } = useCategories()
  const { data: pms = [] } = usePaymentMethods()
  const addCat = useAddCategory(); const delCat = useDeleteCategory()
  const addPm = useAddPaymentMethod(); const delPm = useDeletePaymentMethod()
  const [catName, setCatName] = useState('')
  const [catType, setCatType] = useState<TxType>('expense')
  const [pmName, setPmName] = useState('')

  return (
    <div className="p-5 space-y-8">
      <NavButton to="/household" label="집" />
      <h1 className="text-xl font-bold text-ink">집 설정</h1>

      <section>
        <p className="font-bold text-ink mb-2">카테고리</p>
        <div className="space-y-1 mb-3">
          {cats.map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-sm">
              <span className="text-ink">{c.name}</span>
              <span className="text-sub text-xs">{c.type === 'income' ? '수입' : '지출'}</span>
              <button onClick={() => delCat.mutate(c.id)} className="ml-auto text-sub text-xs">삭제</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="이름" className="flex-1 bg-card rounded-xl px-3 py-2 outline-none" />
          <select value={catType} onChange={(e) => setCatType(e.target.value as TxType)} className="bg-card rounded-xl px-2 outline-none">
            <option value="expense">지출</option><option value="income">수입</option>
          </select>
          <button className="bg-brand text-white rounded-xl px-3 font-semibold"
            onClick={() => { if (catName) { addCat.mutate({ name: catName, icon: '', type: catType, is_fixed: false, sort_order: 99, scope: 'household', is_fund_transfer: false, is_savings: false }); setCatName('') } }}>
            추가
          </button>
        </div>
      </section>

      <section>
        <p className="font-bold text-ink mb-2">결제수단</p>
        <div className="space-y-1 mb-3">
          {pms.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-sm">
              <span className="text-ink">{p.name}</span>
              <button onClick={() => delPm.mutate(p.id)} className="ml-auto text-sub text-xs">삭제</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={pmName} onChange={(e) => setPmName(e.target.value)} placeholder="이름" className="flex-1 bg-card rounded-xl px-3 py-2 outline-none" />
          <button className="bg-brand text-white rounded-xl px-3 font-semibold"
            onClick={() => { if (pmName) { addPm.mutate({ name: pmName, icon: '', sort_order: 99 }); setPmName('') } }}>
            추가
          </button>
        </div>
      </section>
    </div>
  )
}
