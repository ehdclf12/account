import type { ExerciseType, Pattern, SessionKind, SlotRole } from './types'

/** 회복 세션 완료 표식: exerciseId 'recovery'인 SetEntry(done true). 체크 해제는 done:false로 기록하며 엔트리는 남는다. */
export const RECOVERY_EXERCISE_ID = 'recovery'

// ── 시간 추정(분) ──────────────────────────────────────────
export const TIME = {
  compoundSet: 3.25,
  isolationSet: 2,
  supersetRound: 2.75,
  transition: 1.5,
  mainWarmup: 3,
  dynamicWarmup: 7,
  cooldown: 5,
} as const

export const DEFAULT_TIME_BUDGET_MIN = 70
/** 6일 시드 루틴이 맞춰진 예산. 이 이상이면 시드 루틴을 줄이지 않는다. */
export const SEED_ROUTINE_BUDGET_MIN = 70
export const MIN_SLOT_SETS = 2

// ── 부위 그룹 ──────────────────────────────────────────────
export type BodyGroup = 'shoulder' | 'chest' | 'triceps' | 'back' | 'biceps' | 'legs'

export const KIND_GROUPS: Record<SessionKind, BodyGroup[]> = {
  shoulder: ['shoulder', 'chest', 'triceps'],
  back: ['back', 'biceps'],
  legs: ['legs'],
  upper: ['shoulder', 'chest', 'triceps', 'back', 'biceps'],
  full: ['shoulder', 'chest', 'triceps', 'back', 'biceps', 'legs'],
  recovery: [],
}

export const KIND_LABEL: Record<SessionKind, string> = {
  shoulder: '어깨', back: '등', legs: '하체', upper: '상체', full: '전신', recovery: '회복',
}

export const WEEKDAY_SHORT = ['월', '화', '수', '목', '금', '토', '일'] as const
export const WEEKDAY_LONG = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'] as const

export const PATTERN_LABEL: Record<Pattern, string> = {
  v_push: '수직 밀기', h_push: '수평 밀기', lateral_raise: '사이드 레터럴', fly: '플라이',
  triceps_ext: '삼두', v_pull: '수직 당기기', h_pull: '수평 당기기', rear_delt: '후면 어깨', curl: '이두',
  squat: '스쿼트', hinge: '힙 힌지', lunge: '런지', leg_curl: '레그컬', leg_ext: '레그 익스텐션',
  calf_raise: '종아리', core: '코어',
}

/** 팔 슈퍼세트 패턴(신장 강조 1 + 비신장 1 규칙 대상). */
export const ARM_PATTERNS: Pattern[] = ['curl', 'triceps_ext']

// ── 세션 슬롯 템플릿 ───────────────────────────────────────
export interface SlotTemplate {
  pattern: Pattern
  type: ExerciseType
  role: SlotRole
  sets: number
  repMin: number
  repMax: number
  /** 같은 값이면 한 슈퍼세트 */
  superset?: string
}

const PATTERN_TYPE: Record<Pattern, ExerciseType> = {
  v_push: 'compound', h_push: 'compound', v_pull: 'compound', h_pull: 'compound',
  squat: 'compound', hinge: 'compound', lunge: 'compound',
  lateral_raise: 'isolation', fly: 'isolation', triceps_ext: 'isolation', rear_delt: 'isolation',
  curl: 'isolation', leg_curl: 'isolation', leg_ext: 'isolation', calf_raise: 'isolation', core: 'isolation',
}

function s(pattern: Pattern, sets: number, repMin: number, repMax: number, superset?: string): SlotTemplate {
  return { pattern, type: PATTERN_TYPE[pattern], role: 'accessory', sets, repMin, repMax, ...(superset ? { superset } : {}) }
}
function main(t: SlotTemplate): SlotTemplate {
  return { ...t, role: 'main' }
}

export type TemplateKey = 'shoulder' | 'back' | 'legs-a' | 'legs-b' | 'upper' | 'full'

export const SESSION_TEMPLATES: Record<TemplateKey, SlotTemplate[]> = {
  shoulder: [
    main(s('v_push', 4, 6, 8)), s('h_push', 3, 6, 10), s('lateral_raise', 4, 12, 15), s('fly', 3, 10, 12),
    s('triceps_ext', 3, 10, 12, 'ss'), s('triceps_ext', 3, 12, 15, 'ss'),
  ],
  back: [
    main(s('v_pull', 4, 6, 10)), s('h_pull', 3, 6, 10), s('h_pull', 3, 10, 12), s('rear_delt', 3, 15, 15),
    s('curl', 3, 10, 12, 'ss'), s('curl', 3, 10, 12, 'ss'),
  ],
  'legs-a': [
    main(s('squat', 4, 6, 8)), s('hinge', 3, 8, 10), s('squat', 3, 10, 12), s('leg_curl', 3, 10, 12),
    s('calf_raise', 3, 12, 15, 'ss'), s('core', 3, 10, 15, 'ss'),
  ],
  'legs-b': [
    main(s('hinge', 3, 5, 5)), s('lunge', 3, 8, 10), s('leg_ext', 3, 12, 15),
    s('calf_raise', 3, 15, 15, 'ss'), s('core', 3, 12, 15, 'ss'),
  ],
  upper: [
    main(s('h_push', 4, 6, 8)), s('h_pull', 4, 6, 10), s('v_pull', 3, 8, 12), s('lateral_raise', 3, 12, 15),
    s('curl', 3, 10, 12, 'ss'), s('triceps_ext', 3, 10, 12, 'ss'),
  ],
  full: [
    main(s('squat', 3, 6, 8)), s('h_push', 3, 6, 10), s('h_pull', 3, 8, 10), s('hinge', 3, 8, 10),
    s('lateral_raise', 3, 12, 15), s('curl', 2, 10, 12, 'ss'), s('triceps_ext', 2, 10, 12, 'ss'),
  ],
}

// ── 세션 정의와 분할 표 ────────────────────────────────────
export interface SessionDef {
  id: string
  name: string
  kind: SessionKind
  template: TemplateKey | null
  /** A/B 짝 세션 id */
  pair?: string
}

export const RECOVERY_SESSION_ID = 'recovery'
export const RECOVERY_REASON = '가벼운 유산소 35~40분 + 모빌리티 15분'

export const SESSION_DEFS: Record<string, SessionDef> = {
  'shoulder-a': { id: 'shoulder-a', name: '어깨 A', kind: 'shoulder', template: 'shoulder', pair: 'shoulder-b' },
  'shoulder-b': { id: 'shoulder-b', name: '어깨 B', kind: 'shoulder', template: 'shoulder', pair: 'shoulder-a' },
  'back-a': { id: 'back-a', name: '등 A', kind: 'back', template: 'back', pair: 'back-b' },
  'back-b': { id: 'back-b', name: '등 B', kind: 'back', template: 'back', pair: 'back-a' },
  'legs-a': { id: 'legs-a', name: '하체 A', kind: 'legs', template: 'legs-a', pair: 'legs-b' },
  'legs-b': { id: 'legs-b', name: '하체 B', kind: 'legs', template: 'legs-b', pair: 'legs-a' },
  shoulder: { id: 'shoulder', name: '어깨', kind: 'shoulder', template: 'shoulder' },
  back: { id: 'back', name: '등', kind: 'back', template: 'back' },
  upper: { id: 'upper', name: '상체', kind: 'upper', template: 'upper' },
  'upper-a': { id: 'upper-a', name: '상체 A', kind: 'upper', template: 'upper', pair: 'upper-b' },
  'upper-b': { id: 'upper-b', name: '상체 B', kind: 'upper', template: 'upper', pair: 'upper-a' },
  'full-a': { id: 'full-a', name: '전신 A', kind: 'full', template: 'full', pair: 'full-b' },
  'full-b': { id: 'full-b', name: '전신 B', kind: 'full', template: 'full', pair: 'full-a' },
  recovery: { id: 'recovery', name: '회복', kind: 'recovery', template: null },
}

/** 일수별 기본 요일 배치(월=0). null = 휴식. */
export const SPLITS: Record<3 | 4 | 5 | 6, (string | null)[]> = {
  6: ['recovery', 'shoulder-a', 'legs-a', 'back-a', 'shoulder-b', 'legs-b', 'back-b'],
  5: ['shoulder', 'legs-a', 'back', 'recovery', 'upper', 'legs-b', null],
  4: ['upper-a', 'legs-a', 'recovery', 'upper-b', 'legs-b', null, null],
  3: ['full-a', null, 'full-b', null, 'full-a', null, 'recovery'],
}

// ── 6일 시드 루틴(SPEC-2) ──────────────────────────────────
export const SEED_ROUTINE_REASON = '기본 루틴(어깨·하체·등 × 2)'

export const SEED_ROUTINE: Record<string, string[]> = {
  'shoulder-a': ['overhead-press', 'barbell-bench-press', 'dumbbell-lateral-raise', 'cable-fly', 'overhead-cable-extension', 'cable-pushdown'],
  'back-a': ['pull-up', 'barbell-row', 'seated-cable-row', 'face-pull', 'incline-dumbbell-curl', 'preacher-curl'],
  'legs-a': ['back-squat', 'romanian-deadlift', 'leg-press', 'seated-leg-curl', 'standing-calf-raise', 'hanging-leg-raise'],
  'shoulder-b': ['dumbbell-shoulder-press', 'incline-dumbbell-press', 'cable-lateral-raise', 'dumbbell-fly', 'skull-crusher', 'reverse-grip-pushdown'],
  'back-b': ['lat-pulldown', 'chest-supported-row', 'single-arm-dumbbell-row', 'reverse-pec-deck', 'bayesian-cable-curl', 'hammer-curl'],
  'legs-b': ['deadlift', 'bulgarian-split-squat', 'leg-extension', 'seated-calf-raise', 'cable-crunch'],
}

/** 이름 뒤 조사 '와'/'과'. 받침 있는 한글이면 '과', 그 외(받침 없음, A/B 등)는 '와'. */
export function waGwa(name: string): '와' | '과' {
  const c = name.charCodeAt(name.length - 1)
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? '과' : '와'
}

/** 이름 + 와/과 */
export function withWa(name: string): string {
  return `${name}${waGwa(name)}`
}
