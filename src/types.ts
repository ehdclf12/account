export type Role = 'husband' | 'wife'

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

export interface TimeBlockGroup {
  id: string
  who: Role
  name: string
  sort_order: number
  created_at: string
}

export interface TimeBlock {
  id: string
  who: Role
  name: string
  icon: string          // 아이콘 키('book' 등). 못 찾으면 문자열을 그대로 그린다
  color: ArchiveColor | null
  group_id: string | null   // null = '일반 블럭'
  sort_order: number
  archived: boolean
  created_at: string
}

export interface TimeSession {
  id: string
  block_id: string
  who: Role
  started_at: string
  ended_at: string | null   // null = 진행 중
  created_at: string
}

export interface TimeGoal {
  id: string
  who: Role
  title: string
  checklist: ChecklistEntry[]   // 서브목표
  sort_order: number
  created_at: string
}
