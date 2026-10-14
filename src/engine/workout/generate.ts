import { EXERCISES, getExercise } from '@/data/workout/exercises'
import {
  ARM_PATTERNS, KIND_LABEL, MIN_SLOT_SETS, PATTERN_LABEL, RECOVERY_REASON, SEED_ROUTINE, SEED_ROUTINE_BUDGET_MIN,
  SEED_ROUTINE_REASON, SESSION_DEFS, SESSION_TEMPLATES, SPLITS, TIME, withWa, type SessionDef, type SlotTemplate,
} from './constants'
import type { Exercise, Program, Session, Settings, Slot } from './types'

/** 이 시드로 6일 분할을 만들면 사용자 기본 루틴(SPEC-2 시드 프로그램)이 그대로 나온다. */
export const DEFAULT_SEED = 1

/** 시드 난수(mulberry32). 0 이상 1 미만. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** "다시 생성"용 새 시드. */
export function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31) + 2
}

/** 슬롯과 같은 pattern·type의 종목 후보(시드 순서). */
export function candidatesFor(slot: Pick<Slot, 'pattern' | 'type'>): Exercise[] {
  return EXERCISES.filter((e) => e.pattern === slot.pattern && e.type === slot.type)
}

const nameOf = (id: string) => getExercise(id)?.nameKo ?? id

function toSlot(def: SessionDef, t: SlotTemplate, i: number, exerciseId: string, reason: string): Slot {
  const { superset, ...rest } = t
  return { id: `${def.id}-${i}`, ...rest, ...(superset ? { superset: `${def.id}-${superset}` } : {}), exerciseId, reason }
}

function recoverySession(def: SessionDef): Session {
  return { id: def.id, name: def.name, kind: def.kind, slots: [], reason: RECOVERY_REASON }
}

function seedSession(def: SessionDef): Session {
  const template = SESSION_TEMPLATES[def.template!]
  const ids = SEED_ROUTINE[def.id]
  return {
    id: def.id, name: def.name, kind: def.kind, reason: SEED_ROUTINE_REASON,
    slots: template.map((t, i) => toSlot(def, t, i, ids[i], SEED_ROUTINE_REASON)),
  }
}

/** 팔 슈퍼세트 슬롯마다 신장 강조 여부 요구(true/false). 해당 없으면 undefined. */
function stretchRequirements(template: SlotTemplate[], rnd: () => number): (boolean | undefined)[] {
  const req: (boolean | undefined)[] = template.map(() => undefined)
  const groups = new Map<string, number[]>()
  template.forEach((t, i) => { if (t.superset) groups.set(t.superset, [...(groups.get(t.superset) ?? []), i]) })
  for (const idx of groups.values()) {
    if (idx.length !== 2 || !idx.every((i) => ARM_PATTERNS.includes(template[i].pattern))) continue
    const [a, b] = idx
    const firstStretch = template[a].pattern === template[b].pattern ? true : rnd() < 0.5
    req[a] = firstStretch
    req[b] = !firstStretch
  }
  return req
}

function randomSession(def: SessionDef, rnd: () => number, pair: Session | undefined): Session {
  const template = SESSION_TEMPLATES[def.template!]
  const req = stretchRequirements(template, rnd)
  const pairUsed = new Set(pair?.slots.map((s) => s.exerciseId) ?? [])
  const used = new Set<string>()
  const slots = template.map((t, i) => {
    let cands = candidatesFor(t).filter((e) => !used.has(e.id))
    if (t.role === 'main') cands = cands.filter((e) => e.type === 'compound')
    if (req[i] !== undefined) cands = cands.filter((e) => e.stretchEmphasis === req[i])
    const fresh = cands.filter((e) => !pairUsed.has(e.id))
    const pool = fresh.length > 0 ? fresh : cands
    if (pool.length === 0) throw new Error(`후보 종목이 없어요: ${def.id} ${t.pattern}`)
    const e = pool[Math.floor(rnd() * pool.length)]
    used.add(e.id)
    let reason: string
    if (pair && fresh.length > 0) reason = `${withWa(pair.name)} 겹치지 않게 ${e.nameKo}`
    else if (t.role === 'main') reason = `메인 복합 종목으로 ${e.nameKo}`
    else if (req[i] === true) reason = `신장 강조 종목으로 ${e.nameKo}`
    else if (req[i] === false) reason = `수축 위주 종목으로 ${e.nameKo}`
    else reason = `${PATTERN_LABEL[t.pattern]} 종목으로 ${e.nameKo}`
    return toSlot(def, t, i, e.id, reason)
  })
  const reason = pair
    ? `${withWa(pair.name)} 같은 구성, 다른 종목으로 배정`
    : `${KIND_LABEL[def.kind]} 슬롯 구성에 맞춰 종목 배정`
  return { id: def.id, name: def.name, kind: def.kind, slots, reason }
}

/** 세션 추정 시간(분). 회복 세션은 0. */
export function estimateSessionMinutes(session: Pick<Session, 'slots'>): number {
  const { slots } = session
  if (slots.length === 0) return 0
  let work = 0
  let blocks = 0
  const seen = new Set<string>()
  for (const s of slots) {
    if (s.superset) {
      if (seen.has(s.superset)) continue
      seen.add(s.superset)
      const rounds = Math.max(...slots.filter((x) => x.superset === s.superset).map((x) => x.sets))
      work += rounds * TIME.supersetRound
    } else {
      work += s.sets * (s.type === 'compound' ? TIME.compoundSet : TIME.isolationSet)
    }
    blocks += 1
  }
  const warm = TIME.dynamicWarmup + TIME.cooldown + (slots.some((s) => s.role === 'main') ? TIME.mainWarmup : 0)
  return warm + work + Math.max(0, blocks - 1) * TIME.transition
}

type Change = { slotId: string; name: string; from: number; to: number } | { slotId: string; name: string; removed: true }

/**
 * 예산을 넘으면 줄인다: ① 마지막 고립 슬롯 세트 −1 ② 보조 복합 슬롯(뒤에서부터) 세트 −1
 * ③ 마지막 고립 슬롯 제거. 세트 최소 2. 슈퍼세트·메인은 건드리지 않는다.
 */
export function fitToBudget(session: Session, budgetMin: number): Session {
  let slots = session.slots.map((s) => ({ ...s }))
  const changes: Change[] = []
  const recordSets = (s: Slot, from: number) => {
    const prev = changes[changes.length - 1]
    if (prev && prev.slotId === s.id && 'to' in prev) prev.to = s.sets
    else changes.push({ slotId: s.id, name: nameOf(s.exerciseId), from, to: s.sets })
  }
  let fits = true
  while (estimateSessionMinutes({ slots }) > budgetMin) {
    const iso = slots.filter((s) => s.type === 'isolation' && !s.superset)
    const lastIso = iso[iso.length - 1]
    if (lastIso && lastIso.sets > MIN_SLOT_SETS) {
      lastIso.sets -= 1
      recordSets(lastIso, lastIso.sets + 1)
      continue
    }
    const comp = slots.filter((s) => s.type === 'compound' && s.role === 'accessory' && !s.superset && s.sets > MIN_SLOT_SETS)
    const lastComp = comp[comp.length - 1]
    if (lastComp) {
      lastComp.sets -= 1
      recordSets(lastComp, lastComp.sets + 1)
      continue
    }
    if (lastIso) {
      slots = slots.filter((s) => s !== lastIso)
      changes.push({ slotId: lastIso.id, name: nameOf(lastIso.exerciseId), removed: true })
      continue
    }
    fits = false
    break
  }
  if (changes.length === 0 && fits) return { ...session, slots }
  const text = changes.map((c) => ('removed' in c ? `${c.name} 제거` : `${c.name} ${c.from}→${c.to}세트`)).join(', ')
  const tail = fits ? '' : ' (더 줄일 수 없어 예산을 넘어요)'
  return { ...session, slots, reason: `${session.reason} · 시간 예산 ${budgetMin}분 → ${text}${tail}` }
}

export function generateProgram(settings: Settings, seed: number): Program {
  const layout = SPLITS[settings.daysPerWeek]
  const ids = [...new Set(layout.filter((x): x is string => x !== null))]
  const useSeedRoutine = settings.daysPerWeek === 6 && seed === DEFAULT_SEED
  const rnd = seededRandom(seed)
  const built = new Map<string, Session>()
  for (const id of ids) {
    const def = SESSION_DEFS[id]
    let s: Session
    if (def.kind === 'recovery') s = recoverySession(def)
    else if (useSeedRoutine) s = seedSession(def)
    else s = randomSession(def, rnd, def.pair ? built.get(def.pair) : undefined)
    built.set(id, s)
  }
  const skipBudget = useSeedRoutine && settings.timeBudgetMin >= SEED_ROUTINE_BUDGET_MIN
  const sessions = ids.map((id) => {
    const s = built.get(id)!
    return s.kind === 'recovery' || skipBudget ? s : fitToBudget(s, settings.timeBudgetMin)
  })
  return { weekSchedule: [...layout], sessions, seed }
}

/** 세션의 한 슬롯 종목 바꾸기. 같은 pattern·type만 허용, A/B 짝·세션 내 중복은 경고만. */
export function swapExercise(
  program: Program, sessionId: string, slotId: string, exerciseId: string,
): { program: Program; warning?: string } {
  const session = program.sessions.find((s) => s.id === sessionId)
  if (!session) throw new Error(`세션 없음: ${sessionId}`)
  const slot = session.slots.find((s) => s.id === slotId)
  if (!slot) throw new Error(`슬롯 없음: ${slotId}`)
  const ex = getExercise(exerciseId)
  if (!ex || ex.pattern !== slot.pattern || ex.type !== slot.type) throw new Error(`이 슬롯에 맞지 않는 종목: ${exerciseId}`)

  let warning: string | undefined
  const pairId = SESSION_DEFS[sessionId]?.pair
  const pair = pairId ? program.sessions.find((s) => s.id === pairId) : undefined
  if (session.slots.some((s) => s.id !== slotId && s.exerciseId === exerciseId)) warning = '이 세션에 이미 있는 종목이에요'
  else if (pair?.slots.some((s) => s.exerciseId === exerciseId)) warning = `${pair.name}에도 있는 종목이에요`

  const sessions = program.sessions.map((s) =>
    s.id !== sessionId ? s : {
      ...s,
      slots: s.slots.map((sl) => (sl.id === slotId ? { ...sl, exerciseId, reason: `직접 고른 종목: ${ex.nameKo}` } : sl)),
    })
  return warning ? { program: { ...program, sessions }, warning } : { program: { ...program, sessions } }
}
