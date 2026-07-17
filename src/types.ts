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

export type AssetType =
  | 'stock_us' | 'stock_kr' | 'crypto' | 'real_estate' | 'cash' | 'etc' | 'liability'

export interface Asset {
  id: string
  name: string
  type: AssetType
  amount: number
  symbol: string | null
  quantity: number | null
  active: boolean
  created_at: string
}

export type ArchiveKind = 'checklist' | 'link' | 'image'
export type ArchiveColor = 'red' | 'orange' | 'green' | 'blue' | 'purple'
export type SortMode = 'updated' | 'created' | 'name' | 'due'

export interface ChecklistEntry {
  text: string
  done: boolean
}

export interface LinkPreview {
  title: string
  description: string
  image: string
  site: string
}

export interface ArchiveFolder {
  id: string
  name: string
  sort_order: number
  parent_id: string | null
  created_at: string
}

export interface ArchiveItem {
  id: string
  folder_id: string | null
  kind: ArchiveKind
  title: string
  body: string | null
  url: string | null
  preview: LinkPreview | null
  checklist: ChecklistEntry[] | null
  pinned: boolean
  due_date: string | null   // YYYY-MM-DD
  color: ArchiveColor | null
  archived: boolean
  done: boolean   // 체크리스트 카드 전체 완료 여부(하위 항목 유무와 무관)
  created_at: string
  updated_at: string
}
