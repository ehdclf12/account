// Workout 엔진 타입. 화면·Supabase와 무관한 순수 데이터 모양(설계서 "데이터" 절).

export type Pattern =
  | 'v_push' | 'h_push' | 'lateral_raise' | 'fly' | 'triceps_ext'
  | 'v_pull' | 'h_pull' | 'rear_delt' | 'curl'
  | 'squat' | 'hinge' | 'lunge' | 'leg_curl' | 'leg_ext' | 'calf_raise' | 'core'

export type ExerciseType = 'compound' | 'isolation'

export type Muscle =
  | 'front_delt' | 'side_delt' | 'rear_delt'
  | 'chest' | 'upper_chest' | 'triceps'
  | 'lats' | 'upper_back' | 'traps' | 'biceps' | 'brachialis' | 'forearms'
  | 'quads' | 'glutes' | 'hamstrings' | 'adductors' | 'calves'
  | 'abs' | 'obliques' | 'lower_back' | 'hip_flexors'

export interface Exercise {
  id: string
  nameKo: string
  pattern: Pattern
  type: ExerciseType
  primaryMuscles: Muscle[]
  secondaryMuscles: Muscle[]
  stretchEmphasis: boolean
  weightIncrementKg: number
}

export type SessionKind = 'shoulder' | 'back' | 'legs' | 'upper' | 'full' | 'recovery'

export type SlotRole = 'main' | 'accessory'

export interface Slot {
  id: string
  pattern: Pattern
  type: ExerciseType
  role: SlotRole
  sets: number
  repMin: number
  repMax: number
  /** 슈퍼세트 그룹 id. 같은 값을 가진 두 슬롯이 한 슈퍼세트. */
  superset?: string
  exerciseId: string
  reason: string
}

export interface Session {
  id: string
  name: string
  kind: SessionKind
  slots: Slot[]
  reason: string
}

export interface Program {
  /** 월=0 … 일=6. 세션 id 또는 null(휴식). */
  weekSchedule: (string | null)[]
  sessions: Session[]
  seed: number
}

export interface Settings {
  daysPerWeek: 3 | 4 | 5 | 6
  timeBudgetMin: number
}

export interface SetEntry {
  exerciseId: string
  setIndex: number
  weightKg: number | null
  reps: number
  done: boolean
}

export interface WorkoutLog {
  id?: string
  /** YYYY-MM-DD */
  date: string
  sessionId: string
  sets: SetEntry[]
}
