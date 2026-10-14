import { describe, it, expect } from 'vitest'
import { DEFAULT_SEED, generateProgram, candidatesFor, swapExercise, estimateSessionMinutes } from './generate'
import { checkSchedule } from './schedule'
import { ARM_PATTERNS, SESSION_DEFS } from './constants'
import { EXERCISES, getExercise } from '@/data/workout/exercises'
import type { Program, Session, Settings } from './types'

const DAYS = [3, 4, 5, 6] as const
const settings = (daysPerWeek: Settings['daysPerWeek'], timeBudgetMin = 70): Settings => ({ daysPerWeek, timeBudgetMin })
const sessionById = (p: Program, id: string) => p.sessions.find((x) => x.id === id)!
const idByName = (nameKo: string) => {
  const e = EXERCISES.find((x) => x.nameKo === nameKo)
  if (!e) throw new Error(`종목 없음: ${nameKo}`)
  return e.id
}
const names = (s: Session) => s.slots.map((sl) => getExercise(sl.exerciseId)!.nameKo)

describe('종목 시드', () => {
  it('id 중복 없음, 힙 쓰러스트 없음, 증량 단위는 상체 2.5 / 하체 5', () => {
    const ids = EXERCISES.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(EXERCISES.some((e) => e.nameKo.includes('힙 쓰러스트') || e.id.includes('hip-thrust'))).toBe(false)
    const lower = ['squat', 'hinge', 'lunge', 'leg_curl', 'leg_ext', 'calf_raise']
    for (const e of EXERCISES) expect(e.weightIncrementKg).toBe(lower.includes(e.pattern) ? 5 : 2.5)
    expect(EXERCISES.some((e) => e.pattern === 'rear_delt')).toBe(true)
  })
  it('모든 슬롯 pattern·type에 후보가 3개 이상', () => {
    const p = generateProgram(settings(6), 7)
    const q = generateProgram(settings(3), 7)
    for (const s of [...p.sessions, ...q.sessions]) for (const sl of s.slots) {
      expect(candidatesFor(sl).length, sl.pattern).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('요일 배치', () => {
  const nameRow = (p: Program) => p.weekSchedule.map((id) => (id ? sessionById(p, id).name : '휴식'))
  it('일수별 표와 같다', () => {
    expect(nameRow(generateProgram(settings(6), DEFAULT_SEED))).toEqual(['회복', '어깨 A', '하체 A', '등 A', '어깨 B', '하체 B', '등 B'])
    expect(nameRow(generateProgram(settings(5), 1))).toEqual(['어깨', '하체 A', '등', '회복', '상체', '하체 B', '휴식'])
    expect(nameRow(generateProgram(settings(4), 1))).toEqual(['상체 A', '하체 A', '회복', '상체 B', '하체 B', '휴식', '휴식'])
    expect(nameRow(generateProgram(settings(3), 1))).toEqual(['전신 A', '휴식', '전신 B', '휴식', '전신 A', '휴식', '회복'])
  })
  it('3일 분할의 전신 A는 같은 sessionId 주 2회', () => {
    const p = generateProgram(settings(3), 1)
    expect(p.weekSchedule[0]).toBe(p.weekSchedule[4])
    expect(p.sessions.filter((s) => s.id === p.weekSchedule[0])).toHaveLength(1)
  })
  it('weekSchedule의 모든 id에 세션이 있고 seed가 저장된다', () => {
    for (const d of DAYS) {
      const p = generateProgram(settings(d), 42)
      expect(p.weekSchedule).toHaveLength(7)
      expect(p.seed).toBe(42)
      for (const id of p.weekSchedule) if (id) expect(sessionById(p, id)).toBeDefined()
    }
  })
  it('모든 분할이 48시간·회복일 규칙을 통과한다', () => {
    for (const d of DAYS) {
      const p = generateProgram(settings(d), DEFAULT_SEED)
      expect(checkSchedule(p.weekSchedule, p.sessions)).toEqual([])
    }
  })
  it('회복 세션은 슬롯 없이 안내 reason', () => {
    const r = sessionById(generateProgram(settings(6), DEFAULT_SEED), 'recovery')
    expect(r.kind).toBe('recovery')
    expect(r.slots).toEqual([])
    expect(r.reason).toBe('가벼운 유산소 35~40분 + 모빌리티 15분')
  })
})

describe('6일 첫 생성 = 시드 루틴', () => {
  const p = generateProgram(settings(6), DEFAULT_SEED)
  const table: Record<string, string[]> = {
    '어깨 A': ['오버헤드프레스', '바벨 벤치프레스', '덤벨 사이드 레터럴', '케이블 플라이', '오버헤드 케이블 익스텐션', '케이블 푸시다운'],
    '등 A': ['풀업', '바벨로우', '시티드 케이블로우', '페이스풀', '인클라인 덤벨컬', '프리처컬'],
    '하체 A': ['백스쿼트', '루마니안 데드리프트', '레그프레스', '시티드 레그컬', '스탠딩 카프레이즈', '행잉 레그레이즈'],
    '어깨 B': ['덤벨 숄더프레스', '인클라인 덤벨프레스', '케이블 레터럴', '덤벨 플라이', '스컬크러셔', '리버스그립 푸시다운'],
    '등 B': ['랫풀다운', '체스트 서포티드 로우', '싱글암 덤벨로우', '리버스 펙덱', '베이징 케이블컬', '해머컬'],
    '하체 B': ['데드리프트', '불가리안 스플릿 스쿼트', '레그 익스텐션', '시티드 카프레이즈', '케이블 크런치'],
  }
  it.each(Object.entries(table))('%s', (name, exNames) => {
    const s = p.sessions.find((x) => x.name === name)!
    expect(s.slots.map((sl) => sl.exerciseId)).toEqual(exNames.map(idByName))
    expect(s.reason).toBe('기본 루틴(어깨·하체·등 × 2)')
    for (const sl of s.slots) expect(sl.reason).toBe('기본 루틴(어깨·하체·등 × 2)')
  })
  it('슬롯 구성(세트×반복, 슈퍼세트)이 표와 같다', () => {
    const sh = sessionById(p, 'shoulder-a').slots
    expect(sh.map((x) => [x.pattern, x.sets, x.repMin, x.repMax])).toEqual([
      ['v_push', 4, 6, 8], ['h_push', 3, 6, 10], ['lateral_raise', 4, 12, 15], ['fly', 3, 10, 12],
      ['triceps_ext', 3, 10, 12], ['triceps_ext', 3, 12, 15],
    ])
    expect(sh[0].role).toBe('main')
    expect(sh.slice(1).every((x) => x.role === 'accessory')).toBe(true)
    expect(sh[4].superset).toBeDefined()
    expect(sh[4].superset).toBe(sh[5].superset)
    expect(sh[3].superset).toBeUndefined()
    const lb = sessionById(p, 'legs-b').slots
    expect(lb.map((x) => [x.pattern, x.sets, x.repMin, x.repMax])).toEqual([
      ['hinge', 3, 5, 5], ['lunge', 3, 8, 10], ['leg_ext', 3, 12, 15], ['calf_raise', 3, 15, 15], ['core', 3, 12, 15],
    ])
  })
})

describe('규칙 기반 생성', () => {
  const seeds = Array.from({ length: 40 }, (_, i) => i + 2)
  const all = DAYS.flatMap((d) => seeds.map((seed) => generateProgram(settings(d), seed)))

  it('세션 안 같은 종목 없음', () => {
    for (const p of all) for (const s of p.sessions) {
      const ids = s.slots.map((x) => x.exerciseId)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
  it('A/B 짝 세션 사이 같은 종목 없음', () => {
    for (const p of all) for (const s of p.sessions) {
      const pair = SESSION_DEFS[s.id].pair
      if (!pair) continue
      const other = sessionById(p, pair)
      const mine = new Set(s.slots.map((x) => x.exerciseId))
      expect(other.slots.filter((x) => mine.has(x.exerciseId))).toEqual([])
    }
  })
  it('팔 슈퍼세트는 신장 강조 1개 + 아닌 것 1개', () => {
    for (const p of [...all, generateProgram(settings(6), DEFAULT_SEED)]) for (const s of p.sessions) {
      const groups = new Map<string, boolean[]>()
      for (const sl of s.slots) {
        if (!sl.superset || !ARM_PATTERNS.includes(sl.pattern)) continue
        groups.set(sl.superset, [...(groups.get(sl.superset) ?? []), getExercise(sl.exerciseId)!.stretchEmphasis])
      }
      for (const flags of groups.values()) expect(flags.slice().sort()).toEqual([false, true])
    }
  })
  it('메인 슬롯은 복합 종목만, 모든 종목은 슬롯 pattern·type과 일치', () => {
    for (const p of all) for (const s of p.sessions) for (const sl of s.slots) {
      const e = getExercise(sl.exerciseId)!
      expect(e.pattern).toBe(sl.pattern)
      expect(e.type).toBe(sl.type)
      if (sl.role === 'main') expect(e.type).toBe('compound')
    }
  })
  it('모든 세션·슬롯에 reason', () => {
    for (const p of all) for (const s of p.sessions) {
      expect(s.reason.length).toBeGreaterThan(0)
      for (const sl of s.slots) expect(sl.reason.length).toBeGreaterThan(0)
    }
  })
  it('B 세션 reason은 짝과 겹치지 않게 고른 이유', () => {
    const p = generateProgram(settings(6), 5)
    const b = sessionById(p, 'shoulder-b')
    const name = getExercise(b.slots[1].exerciseId)!.nameKo
    expect(b.slots[1].reason).toBe(`어깨 A와 겹치지 않게 ${name}`)
  })
  it('같은 시드 → 같은 결과', () => {
    for (const d of DAYS) expect(generateProgram(settings(d), 123)).toEqual(generateProgram(settings(d), 123))
  })
  it('시드가 다르면 다른 루틴이 나온다(시드 루틴과도 다름)', () => {
    const base = JSON.stringify(generateProgram(settings(6), DEFAULT_SEED).sessions.map((s) => s.slots.map((x) => x.exerciseId)))
    const others = seeds.map((seed) => JSON.stringify(generateProgram(settings(6), seed).sessions.map((s) => s.slots.map((x) => x.exerciseId))))
    expect(others.some((o) => o !== base)).toBe(true)
    expect(new Set(others).size).toBeGreaterThan(1)
  })
})

describe('시간 예산', () => {
  it('세션 시간 추정', () => {
    const p = generateProgram(settings(6), DEFAULT_SEED)
    // 메인 4×3.25 + 3×3.25 + 4×2 + 3×2 + SS 3×2.75 + 전환 4×1.5 + 워밍업 3 + 7 + 5
    expect(estimateSessionMinutes(sessionById(p, 'shoulder-a'))).toBe(66)
    expect(estimateSessionMinutes(sessionById(p, 'recovery'))).toBe(0)
  })
  it('시드 루틴은 예산 70 이상이면 줄이지 않는다', () => {
    const a = generateProgram(settings(6, 70), DEFAULT_SEED)
    const b = generateProgram(settings(6, 200), DEFAULT_SEED)
    expect(a).toEqual(b)
  })
  it('축소 순서: 마지막 고립 −1 → 보조 복합 −1 → 마지막 고립 제거, reason에 기록', () => {
    const p = generateProgram(settings(6, 60), DEFAULT_SEED)
    const s = sessionById(p, 'shoulder-a')
    expect(s.reason).toBe('기본 루틴(어깨·하체·등 × 2) · 시간 예산 60분 → 케이블 플라이 3→2세트, 바벨 벤치프레스 3→2세트, 케이블 플라이 제거')
    expect(names(s)).toEqual(['오버헤드프레스', '바벨 벤치프레스', '덤벨 사이드 레터럴', '오버헤드 케이블 익스텐션', '케이블 푸시다운'])
    expect(s.slots.map((x) => x.sets)).toEqual([4, 2, 4, 3, 3])
    expect(estimateSessionMinutes(s)).toBeLessThanOrEqual(60)
  })
  it('한 단계로 충분하면 거기서 멈춘다(상체 71분 → 레터럴 −1)', () => {
    const p = generateProgram(settings(5, 70), 9)
    const s = sessionById(p, 'upper')
    const lat = getExercise(s.slots[3].exerciseId)!.nameKo
    expect(s.slots.map((x) => x.sets)).toEqual([4, 4, 3, 2, 3, 3])
    expect(s.reason.endsWith(`시간 예산 70분 → ${lat} 3→2세트`)).toBe(true)
    expect(estimateSessionMinutes(s)).toBeLessThanOrEqual(70)
  })
  it('예산이 넉넉하면 reason에 축소 내용이 없다', () => {
    const p = generateProgram(settings(5, 90), 9)
    for (const s of p.sessions) expect(s.reason).not.toContain('시간 예산')
  })
  it('아주 작은 예산: 세트는 최소 2, 메인·슈퍼세트는 남는다', () => {
    for (const d of DAYS) {
      const p = generateProgram(settings(d, 20), 3)
      for (const s of p.sessions) {
        if (s.kind === 'recovery') continue
        expect(s.slots[0].role).toBe('main')
        expect(s.slots.every((x) => x.sets >= 2)).toBe(true)
        expect(s.slots.filter((x) => x.superset)).toHaveLength(2)
        expect(s.slots.some((x) => x.type === 'isolation' && !x.superset)).toBe(false)
        expect(s.reason).toContain('시간 예산 20분')
      }
    }
  })
})

describe('swapExercise / candidatesFor', () => {
  const p = generateProgram(settings(6), DEFAULT_SEED)
  it('후보는 같은 pattern·type', () => {
    const slot = sessionById(p, 'shoulder-a').slots[1]
    const c = candidatesFor(slot)
    expect(c.length).toBeGreaterThanOrEqual(3)
    expect(c.every((e) => e.pattern === 'h_push' && e.type === 'compound')).toBe(true)
  })
  it('한 슬롯만 바꾸고 원본은 그대로', () => {
    const slot = sessionById(p, 'shoulder-a').slots[1]
    const r = swapExercise(p, 'shoulder-a', slot.id, 'dumbbell-bench-press')
    expect(r.warning).toBeUndefined()
    expect(sessionById(r.program, 'shoulder-a').slots[1].exerciseId).toBe('dumbbell-bench-press')
    expect(sessionById(r.program, 'shoulder-a').slots[1].reason.length).toBeGreaterThan(0)
    expect(sessionById(p, 'shoulder-a').slots[1].exerciseId).toBe('barbell-bench-press')
  })
  it('A/B 짝 중복은 경고만 하고 허용', () => {
    const slot = sessionById(p, 'shoulder-a').slots[1]
    const r = swapExercise(p, 'shoulder-a', slot.id, 'incline-dumbbell-press')
    expect(r.warning).toBe('어깨 B에도 있는 종목이에요')
    expect(sessionById(r.program, 'shoulder-a').slots[1].exerciseId).toBe('incline-dumbbell-press')
  })
  it('다른 pattern 종목이나 없는 슬롯은 오류', () => {
    const slot = sessionById(p, 'shoulder-a').slots[1]
    expect(() => swapExercise(p, 'shoulder-a', slot.id, 'back-squat')).toThrow()
    expect(() => swapExercise(p, 'shoulder-a', 'nope', 'dumbbell-bench-press')).toThrow()
  })
})
