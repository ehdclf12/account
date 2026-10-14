# Workout — 규칙 기반 개인 PT 코치 설계 (1단계)

2026-10-14

## 목표

☰ 메뉴에 **Workout**을 추가한다. 앱이 내 주간 루틴을 만들어 주고, 헬스장에서 오늘 할 운동을
보여주며, 세트마다 무게·횟수를 기록하면 **다음 처방(무게·횟수)과 그 이유**를 규칙으로 계산한다.
AI·서버 계산 없음, 무료. 참고한 사용자 명세(SPEC-2)의 "느낌"만 따르고, 아래에 적힌 것만 만든다.

- **기록은 사람별**(`who`)이다. Time과 같다.
- 모든 처방·생성 결과에 사용자에게 보여줄 **한 줄 이유(`reason`)**를 붙인다.

## 범위

**넣는 것**: 루틴 자동 생성(조건 2개) · 주간 일정(요일 맞바꾸기 + 규칙 경고, 오늘만 바꾸기) ·
오늘의 운동(세트별 무게·횟수·완료 체크) · 다음 처방 · 종목별 지난 기록과 추정 1RM.

**빼는 것(후속 단계)**: RIR, 휴식 타이머, 기구·부상·경력 입력, 종목 즉석 교체 후보 추천,
디로드·컨디션 조정, 볼륨 계산·그래프, 워밍업·쿨다운 스트레칭 구성, 유산소 타이머, 주간 리포트,
대시보드 Workout 노드.

## 루틴 자동 생성

### 입력(처음 한 번, 언제든 다시)
- 주당 운동 일수: 3 · 4 · 5 · 6
- 웨이트 날 시간 예산: 분, 기본 70

### 분할과 기본 요일

| 일수 | 월 | 화 | 수 | 목 | 금 | 토 | 일 |
|---|---|---|---|---|---|---|---|
| 6 | 회복 | 어깨 A | 하체 A | 등 A | 어깨 B | 하체 B | 등 B |
| 5 | 어깨 | 하체 A | 등 | 회복 | 상체 | 하체 B | 휴식 |
| 4 | 상체 A | 하체 A | 회복 | 상체 B | 하체 B | 휴식 | 휴식 |
| 3 | 전신 A | 휴식 | 전신 B | 휴식 | 전신 A | 휴식 | 회복 |

- **회복**: 웨이트 없음. "가벼운 유산소 35~40분 + 모빌리티 15분" 안내 카드와 완료 체크 하나.
- **휴식**: 아무것도 없음.
- 3일 분할의 "전신 A"는 같은 세션을 주 2회 한다(같은 sessionId).

### 세션 구성(슬롯) — 각 줄은 `패턴 · 세트×반복`

| 세션 | 슬롯 (순서대로, 첫 줄이 메인) |
|---|---|
| 어깨 | v_push 4×6~8 · h_push 3×6~10 · lateral_raise 4×12~15 · fly 3×10~12 · [SS] triceps_ext 3×10~12 + triceps_ext 3×12~15 |
| 등 | v_pull 4×6~10 · h_pull 3×6~10 · h_pull 3×10~12 · rear_delt 3×15 · [SS] curl 3×10~12 + curl 3×10~12 |
| 하체 A | squat 4×6~8 · hinge 3×8~10 · squat 3×10~12 · leg_curl 3×10~12 · [SS] calf_raise 3×12~15 + core 3×10~15 |
| 하체 B | hinge 3×5 · lunge 3×8~10 · hip_thrust 3×8~10 · leg_ext 3×12~15 · [SS] calf_raise 3×15 + core 3×12~15 |
| 상체 | h_push 4×6~8 · h_pull 4×6~10 · v_pull 3×8~12 · lateral_raise 3×12~15 · [SS] curl 3×10~12 + triceps_ext 3×10~12 |
| 전신 | squat 3×6~8 · h_push 3×6~10 · h_pull 3×8~10 · hinge 3×8~10 · lateral_raise 3×12~15 · [SS] curl 2×10~12 + triceps_ext 2×10~12 |

[SS] = 슈퍼세트(두 종목을 번갈아 1세트씩). 어깨 A/B·등 A/B·상체 A/B·전신 A/B는 같은 슬롯 구성에
**다른 종목**을 배정한다.

### 종목 배정 규칙
1. **6일 분할의 첫 생성**은 사용자 루틴(SPEC-2 시드 프로그램)을 그대로 쓴다:

| 세션 | 종목 |
|---|---|
| 어깨 A | 오버헤드프레스 / 바벨 벤치프레스 / 덤벨 사이드 레터럴 / 케이블 플라이 / [SS] 오버헤드 케이블 익스텐션 + 케이블 푸시다운 |
| 등 A | 풀업 / 바벨로우 / 시티드 케이블로우 / 페이스풀 / [SS] 인클라인 덤벨컬 + 프리처컬 |
| 하체 A | 백스쿼트 / 루마니안 데드리프트 / 레그프레스 / 시티드 레그컬 / [SS] 스탠딩 카프레이즈 + 행잉 레그레이즈 |
| 어깨 B | 덤벨 숄더프레스 / 인클라인 덤벨프레스 / 케이블 레터럴 / 덤벨 플라이 / [SS] 스컬크러셔 + 리버스그립 푸시다운 |
| 등 B | 랫풀다운 / 체스트 서포티드 로우 / 싱글암 덤벨로우 / 리버스 펙덱 / [SS] 베이징 케이블컬 + 해머컬 |
| 하체 B | 데드리프트 / 불가리안 스플릿 스쿼트 / 힙 쓰러스트 / 레그 익스텐션 / [SS] 시티드 카프레이즈 + 케이블 크런치 |

   reason: "기본 루틴(어깨·하체·등 × 2)".
2. **그 외(3·4·5일, 또는 "다시 생성")**: 슬롯마다 같은 `pattern`·`type`의 종목 중에서 고른다.
   - 같은 세션 안, 그리고 A/B 짝 세션 사이에 **같은 종목 금지**.
   - 팔 슈퍼세트의 두 종목은 하나는 `stretchEmphasis`(예: 오버헤드 익스텐션, 인클라인 컬), 하나는 아님.
   - 메인 슬롯은 복합(compound) 종목만.
   - 후보 중 무작위(시드 난수, 생성마다 새 시드). reason 예: "어깨 A와 겹치지 않게 인클라인 프레스".
3. **종목 하나 바꾸기**: 세션의 한 슬롯에서 같은 pattern·type 후보 목록을 보여주고 사용자가 고른다.
   A/B 짝 중복은 경고만 하고 허용한다.

### 시간 예산
- 추정: 복합 세트 3.25분, 고립 세트 2분, 슈퍼세트 1라운드 2.75분, 종목 전환 1.5분,
  메인 종목 워밍업 3분, 동적 워밍업 7분 + 쿨다운 5분.
- 예산을 넘으면 순서대로 줄인다(넘지 않을 때까지): ① 마지막 고립 슬롯 세트 −1
  ② 보조 복합 슬롯 세트 −1 ③ 마지막 고립 슬롯 제거. 슬롯 세트는 최소 2.
  줄인 내용은 세션 reason에 남긴다("시간 예산 60분 → 케이블 플라이 3→2세트").
- 6일 시드 루틴은 70분 기준으로 맞춰져 있다고 보고, 예산이 70 이상이면 줄이지 않는다.

## 주간 일정

- 요일 7칸: 요일 · 세션 · **직전 같은 부위와의 간격**("어깨 화요일 이후 72시간", "이번 주 처음") ·
  완료 상태.
- **부위 그룹**(간격·규칙 계산용): 어깨 세션 = 어깨·가슴·삼두 / 등 세션 = 등·이두 / 하체 = 하체 /
  상체 = 어깨·가슴·삼두·등·이두 / 전신 = 전부. 두 세션은 그룹이 하나라도 겹치면 "같은 부위".
- **요일 맞바꾸기**: 두 요일을 골라 세션을 서로 바꾼다(영구, 루틴에 저장).
  - 하드 규칙: 같은 부위 세션 간격 ≥ 48시간(요일 차 2일 이상, 주를 넘어 순환 계산).
    회복·휴식일 ≥ 1일(맞바꾸기로는 항상 유지되지만 검사는 한다).
  - 위반이면 경고 + **대안**(그 세션과 바꿔도 규칙을 지키는 다른 요일 목록)을 보여준다.
    사용자는 "그래도 바꾸기"를 고를 수 있다.
- **오늘만 바꾸기**: 오늘 할 세션을 다른 세션(회복 포함)으로 고른다. 주간 루틴은 그대로.
  오늘 기록에 선택한 sessionId가 남는다.

## 오늘의 운동

- 오늘 요일의 세션(또는 오늘만 바꾼 세션). 휴식이면 "오늘은 쉬는 날" + 오늘만 바꾸기 버튼.
- 종목 카드: 이름 · `세트×반복` · **처방 무게와 reason** · 세트 줄.
- 세트 줄: `[무게 kg] [횟수] ☐`
  - 무게: 처방 무게로 미리 채움(첫 기록이면 비움). 세트마다 수정 가능. 0.5kg 단위 숫자.
  - 횟수: 목표 범위의 **최대값**으로 미리 채움, 수정 가능.
  - ☐ 체크 = 그 세트 완료로 저장. 다시 누르면 취소.
- 슈퍼세트 두 종목은 한 카드에 묶어 번갈아 표시.
- 세션 상태: 체크된 세트 0 = 시작 전, 1개 이상 = 진행 중, 전부 = ✅ 완료.
  간격 계산·"이번 주 처음" 판단은 체크된 세트가 1개 이상인 날을 "운동한 날"로 본다.
- 첫 기록 안내: "처음 하는 종목이에요 → 목표 횟수를 겨우 채울 무게보다 한 단계 가볍게 시작하세요".

## 다음 처방 규칙 (RIR 없음)

입력: 그 종목의 **직전 수행일** 체크된 세트들(그 전 수행일 1회분도 참고), 슬롯(repMin, repMax),
종목 증량 단위.

| 조건 | 처방 | reason |
|---|---|---|
| 체크된 세트 전부 reps ≥ repMax | 무게 + 증량, 목표 reps = repMin | "지난번 {n}세트 모두 {repMax}회 성공 → {inc}kg 올려보세요" |
| 첫 세트 reps < repMin, 그 전 수행일도 첫 세트 미달 | 무게 × 0.9를 증량 단위로 반올림(내림) | "2회 연속 목표 미달 → 10% 낮춰 다시 쌓아가요" |
| 첫 세트 reps < repMin (처음 미달) | 무게 유지 | "이번엔 목표에 못 미쳤어요 → 같은 무게로 재도전" |
| 그 외 | 무게 유지, 세트마다 직전 reps + 1(최대 repMax) | "같은 무게에서 횟수를 1개씩 늘려보세요" |
| 기록 없음 | 무게 비움 | 첫 기록 안내 |

- 처방 무게는 직전 수행일 **첫 체크 세트의 무게**를 기준으로 한다.
- 증량 단위: 상체 종목 2.5kg, 하체 종목 5kg(종목 데이터에 저장).
- 실패 횟수는 저장하지 않고 기록에서 매번 계산한다.

## 기록

- 종목 목록 → 종목별 수행일 리스트: 날짜 · 세트별 `무게×횟수` · 그날 **추정 1RM**(최고 세트 기준).
- 추정 1RM = `무게 × (1 + 횟수 / 30)` (Epley), 소수 1자리.
- 그래프는 이번 범위 아님.

## 데이터

```sql
workout_programs
  who text primary key check (who in ('husband','wife')),
  settings jsonb not null,   -- { daysPerWeek: 3|4|5|6, timeBudgetMin: number }
  program  jsonb not null,   -- { weekSchedule: (sessionId|null)[7] (월=0), sessions: Session[], seed: number }
  updated_at timestamptz not null default now()

workout_logs
  id uuid primary key default gen_random_uuid(),
  who text not null check (who in ('husband','wife')),
  date date not null,
  session_id text not null,
  sets jsonb not null default '[]',   -- { exerciseId, setIndex, weightKg: number|null, reps: number, done: boolean }[]
  created_at, updated_at timestamptz not null default now(),
  unique (who, date)
```

- RLS `household_only`(기존 `is_household_member()`), realtime publication 추가.
- 마이그레이션 파일 `supabase/schema-workout.sql`, 사용자가 직접 실행(프로젝트 `gkblndlotwdyoaxfyevs`).
- Session = `{ id, name, kind: 'shoulder'|'back'|'legs'|'upper'|'full'|'recovery', slots: Slot[], reason }`,
  Slot = `{ id, pattern, type, role: 'main'|'accessory', sets, repMin, repMax, superset?: string, exerciseId, reason }`.
- 종목 시드: `src/data/workout/exercises.ts`(타입 있는 TS 배열). 필드는 쓰는 것만:
  `id, nameKo, pattern, type, primaryMuscles, secondaryMuscles, stretchEmphasis, weightIncrementKg`.
  SPEC-2 6장 표 + 시드 프로그램 종목 전부를 포함한다. 패턴에 `rear_delt`, `hip_thrust`를 추가한다.

## 구조

| 위치 | 역할 |
|---|---|
| `src/engine/workout/constants.ts` | 시간 추정 상수, 증량, 부위 그룹, 분할 표 |
| `src/engine/workout/generate.ts` | `generateProgram(settings, seed)` → Program (+reason) |
| `src/engine/workout/schedule.ts` | 간격 계산, 맞바꾸기 규칙 검사·대안 |
| `src/engine/workout/prescribe.ts` | `prescribe(history, slot, exercise)` → `{ weightKg|null, targetReps[], reason }`, `e1rm()` |
| `src/data/workout/exercises.ts` | 종목 시드 |
| `src/hooks/useWorkout.ts` | 프로그램·기록 조회/저장(React Query, who 스코프) |
| `src/screens/WorkoutScreen.tsx` + `src/components/workout/*` | 탭: 오늘 · 주간 · 기록, 첫 진입 시 조건 입력 |
| `src/lib/menu.ts` | Workout 항목 추가(`/workout`) |

엔진은 화면과 분리된 순수 함수이며 단위 테스트를 둔다.

## 예외 상황

- 프로그램 없음 → 조건 입력 화면.
- 저장 실패 → 기존 전역 토스트(MutationCache)로 알림, 체크 상태는 서버 값으로 되돌린다.
- 루틴 다시 생성 → 확인창("지난 기록은 남아요"). 기록은 exerciseId로 이어지므로 같은 종목이면 처방도 이어진다.
- 루틴에서 빠진 종목의 지난 기록도 기록 탭에 남는다.

## 테스트

- `generate.test.ts`: 일수별 요일 배치가 표와 같음, 6일 첫 생성이 시드 루틴과 같음, A/B·세션 내 종목 중복 없음,
  팔 슈퍼세트 stretchEmphasis 1개 규칙, 메인 슬롯 복합만, 같은 시드 → 같은 결과, 시간 예산 축소 순서와 reason,
  모든 분할이 48시간·회복일 규칙 통과.
- `schedule.test.ts`: 간격 문구("어깨 화요일 이후 72시간", "이번 주 처음"), 맞바꾸기 위반 검출과 대안 목록.
- `prescribe.test.ts`: 표의 다섯 경우와 경계(정확히 repMax/repMin), 10% 반올림, 체크 안 된 세트 무시, e1RM.
- 화면: 세트 체크·무게 입력 저장 흐름의 컴포넌트 테스트(훅 목킹), 빌드·전체 테스트 통과,
  미리보기에서 실기기 확인.

## 의료 고지

조건 입력 화면에 "운동 처방은 일반적인 규칙에 따른 안내이며 의료적 조언이 아니에요"를 표시한다.
