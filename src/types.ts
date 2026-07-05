export type Role = 'husband' | 'wife'
export type TxType = 'expense' | 'income'
export type Scope = 'household' | 'business'

export interface Category {
  id: string
  name: string
  icon: string
  type: TxType
  is_fixed: boolean
  sort_order: number
  scope: Scope
  is_fund_transfer: boolean
}

export interface PaymentMethod {
  id: string
  name: string
  icon: string
  sort_order: number
}

export interface Transaction {
  id: string
  who: Role
  type: TxType
  amount: number
  category_id: string | null
  payment_method_id: string | null
  date: string // YYYY-MM-DD
  memo: string
  created_at: string
  scope: Scope
}

export interface Budget {
  id: string
  category_id: string
  month: string // YYYY-MM
  amount: number
}
