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
  is_savings: boolean
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
  fixed_cost_id?: string | null
  savings_goal_id?: string | null
}

export interface FixedCost {
  id: string
  scope: Scope
  name: string
  amount: number
  category_id: string | null
  day: number
  active: boolean
  who: Role | null   // null = 공동
}

export interface Budget {
  id: string
  category_id: string
  month: string // YYYY-MM
  amount: number
}

export interface SavingsGoal {
  id: string
  name: string
  target_amount: number
  target_year: number | null
  target_quarter: number | null // 1..4, null=연도 목표
  active: boolean
  created_at: string
}
