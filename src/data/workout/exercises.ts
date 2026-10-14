import type { Exercise, ExerciseType, Muscle, Pattern } from '@/engine/workout/types'

// 종목 시드(SPEC-2 6장 표 + 4장 시드 프로그램 + 후보 확보용 보충). 증량 단위: 상체 2.5kg, 하체 5kg.
// 힙 쓰러스트는 넣지 않는다(사용자 요청). 프론트 레이즈·스트레이트암 풀다운·싱글암 케이블 풀다운·
// 힙 어브덕션은 쓰는 세션 슬롯 패턴이 없어 넣지 않는다.
const UP = 2.5
const LOW = 5

function ex(
  id: string, nameKo: string, pattern: Pattern, type: ExerciseType,
  primaryMuscles: Muscle[], secondaryMuscles: Muscle[], stretchEmphasis: boolean, weightIncrementKg: number,
): Exercise {
  return { id, nameKo, pattern, type, primaryMuscles, secondaryMuscles, stretchEmphasis, weightIncrementKg }
}

export const EXERCISES: Exercise[] = [
  // v_push
  ex('overhead-press', '오버헤드프레스', 'v_push', 'compound', ['front_delt'], ['side_delt', 'triceps', 'upper_chest'], false, UP),
  ex('dumbbell-shoulder-press', '덤벨 숄더프레스', 'v_push', 'compound', ['front_delt'], ['side_delt', 'triceps'], false, UP),
  ex('machine-shoulder-press', '머신 숄더프레스', 'v_push', 'compound', ['front_delt'], ['side_delt', 'triceps'], false, UP),
  ex('arnold-press', '아놀드 프레스', 'v_push', 'compound', ['front_delt'], ['side_delt', 'triceps'], false, UP),
  // h_push
  ex('barbell-bench-press', '바벨 벤치프레스', 'h_push', 'compound', ['chest'], ['front_delt', 'triceps'], false, UP),
  ex('incline-dumbbell-press', '인클라인 덤벨프레스', 'h_push', 'compound', ['upper_chest'], ['front_delt', 'triceps'], false, UP),
  ex('dumbbell-bench-press', '덤벨 벤치프레스', 'h_push', 'compound', ['chest'], ['front_delt', 'triceps'], false, UP),
  ex('incline-barbell-press', '인클라인 바벨 벤치프레스', 'h_push', 'compound', ['upper_chest'], ['front_delt', 'triceps'], false, UP),
  ex('machine-chest-press', '머신 체스트프레스', 'h_push', 'compound', ['chest'], ['front_delt', 'triceps'], false, UP),
  ex('dips', '딥스', 'h_push', 'compound', ['chest', 'triceps'], ['front_delt'], true, UP),
  ex('close-grip-bench-press', '클로즈그립 벤치', 'h_push', 'compound', ['triceps', 'chest'], ['front_delt'], false, UP),
  // lateral_raise
  ex('dumbbell-lateral-raise', '덤벨 사이드 레터럴', 'lateral_raise', 'isolation', ['side_delt'], ['traps'], false, UP),
  ex('cable-lateral-raise', '케이블 레터럴', 'lateral_raise', 'isolation', ['side_delt'], [], true, UP),
  ex('machine-lateral-raise', '머신 레터럴', 'lateral_raise', 'isolation', ['side_delt'], [], false, UP),
  // fly
  ex('cable-fly', '케이블 플라이', 'fly', 'isolation', ['chest'], ['front_delt'], false, UP),
  ex('dumbbell-fly', '덤벨 플라이', 'fly', 'isolation', ['chest'], ['front_delt'], true, UP),
  ex('pec-deck-fly', '펙덱 플라이', 'fly', 'isolation', ['chest'], ['front_delt'], false, UP),
  // triceps_ext
  ex('overhead-cable-extension', '오버헤드 케이블 익스텐션', 'triceps_ext', 'isolation', ['triceps'], [], true, UP),
  ex('cable-pushdown', '케이블 푸시다운', 'triceps_ext', 'isolation', ['triceps'], [], false, UP),
  ex('skull-crusher', '스컬크러셔', 'triceps_ext', 'isolation', ['triceps'], [], true, UP),
  ex('reverse-grip-pushdown', '리버스그립 푸시다운', 'triceps_ext', 'isolation', ['triceps'], ['forearms'], false, UP),
  ex('dumbbell-overhead-extension', '덤벨 오버헤드 익스텐션', 'triceps_ext', 'isolation', ['triceps'], [], true, UP),
  ex('triceps-kickback', '트라이셉스 킥백', 'triceps_ext', 'isolation', ['triceps'], [], false, UP),
  // v_pull
  ex('pull-up', '풀업', 'v_pull', 'compound', ['lats'], ['biceps', 'upper_back'], true, UP),
  ex('lat-pulldown', '랫풀다운', 'v_pull', 'compound', ['lats'], ['biceps', 'upper_back'], false, UP),
  ex('chin-up', '친업', 'v_pull', 'compound', ['lats'], ['biceps', 'upper_back'], true, UP),
  ex('neutral-grip-pulldown', '뉴트럴 그립 풀다운', 'v_pull', 'compound', ['lats'], ['biceps', 'brachialis', 'upper_back'], false, UP),
  // h_pull
  ex('barbell-row', '바벨로우', 'h_pull', 'compound', ['upper_back', 'lats'], ['biceps', 'rear_delt', 'lower_back'], false, UP),
  ex('seated-cable-row', '시티드 케이블로우', 'h_pull', 'compound', ['upper_back', 'lats'], ['biceps', 'rear_delt'], false, UP),
  ex('chest-supported-row', '체스트 서포티드 로우', 'h_pull', 'compound', ['upper_back'], ['lats', 'biceps', 'rear_delt'], false, UP),
  ex('single-arm-dumbbell-row', '싱글암 덤벨로우', 'h_pull', 'compound', ['lats'], ['upper_back', 'biceps'], true, UP),
  ex('t-bar-row', '티바 로우', 'h_pull', 'compound', ['upper_back', 'lats'], ['biceps', 'rear_delt'], false, UP),
  // rear_delt
  ex('face-pull', '페이스풀', 'rear_delt', 'isolation', ['rear_delt'], ['traps', 'upper_back'], false, UP),
  ex('reverse-pec-deck', '리버스 펙덱', 'rear_delt', 'isolation', ['rear_delt'], ['upper_back'], false, UP),
  ex('bent-over-rear-delt-raise', '벤트오버 리어델트 레이즈', 'rear_delt', 'isolation', ['rear_delt'], ['upper_back'], false, UP),
  // curl
  ex('incline-dumbbell-curl', '인클라인 덤벨컬', 'curl', 'isolation', ['biceps'], ['forearms'], true, UP),
  ex('preacher-curl', '프리처컬', 'curl', 'isolation', ['biceps'], ['brachialis'], false, UP),
  ex('bayesian-cable-curl', '베이징 케이블컬', 'curl', 'isolation', ['biceps'], [], true, UP),
  ex('hammer-curl', '해머컬', 'curl', 'isolation', ['brachialis', 'biceps'], ['forearms'], false, UP),
  ex('incline-hammer-curl', '인클라인 해머컬', 'curl', 'isolation', ['brachialis', 'biceps'], ['forearms'], true, UP),
  ex('barbell-curl', '바벨컬', 'curl', 'isolation', ['biceps'], ['forearms'], false, UP),
  // squat
  ex('back-squat', '백스쿼트', 'squat', 'compound', ['quads', 'glutes'], ['adductors', 'lower_back'], false, LOW),
  ex('leg-press', '레그프레스', 'squat', 'compound', ['quads'], ['glutes', 'adductors'], false, LOW),
  ex('front-squat', '프론트 스쿼트', 'squat', 'compound', ['quads'], ['glutes', 'abs'], false, LOW),
  ex('hack-squat', '핵 스쿼트', 'squat', 'compound', ['quads'], ['glutes'], false, LOW),
  ex('deep-squat', '딥 스쿼트', 'squat', 'compound', ['quads', 'glutes'], ['adductors', 'lower_back'], true, LOW),
  // hinge
  ex('romanian-deadlift', '루마니안 데드리프트', 'hinge', 'compound', ['hamstrings', 'glutes'], ['lower_back'], true, LOW),
  ex('deadlift', '데드리프트', 'hinge', 'compound', ['glutes', 'hamstrings', 'lower_back'], ['quads', 'traps', 'forearms'], false, LOW),
  ex('good-morning', '굿모닝', 'hinge', 'compound', ['hamstrings', 'lower_back'], ['glutes'], false, LOW),
  // lunge
  ex('bulgarian-split-squat', '불가리안 스플릿 스쿼트', 'lunge', 'compound', ['quads', 'glutes'], ['adductors'], true, LOW),
  ex('walking-lunge', '워킹 런지', 'lunge', 'compound', ['quads', 'glutes'], ['hamstrings'], false, LOW),
  ex('reverse-lunge', '리버스 런지', 'lunge', 'compound', ['glutes', 'quads'], ['hamstrings'], false, LOW),
  ex('step-up', '스텝업', 'lunge', 'compound', ['glutes', 'quads'], ['hamstrings'], true, LOW),
  // leg_curl
  ex('seated-leg-curl', '시티드 레그컬', 'leg_curl', 'isolation', ['hamstrings'], [], true, LOW),
  ex('lying-leg-curl', '라잉 레그컬', 'leg_curl', 'isolation', ['hamstrings'], ['calves'], false, LOW),
  ex('standing-leg-curl', '스탠딩 레그컬', 'leg_curl', 'isolation', ['hamstrings'], [], false, LOW),
  // leg_ext
  ex('leg-extension', '레그 익스텐션', 'leg_ext', 'isolation', ['quads'], [], false, LOW),
  ex('single-leg-extension', '싱글 레그 익스텐션', 'leg_ext', 'isolation', ['quads'], [], false, LOW),
  ex('sissy-squat', '시시 스쿼트', 'leg_ext', 'isolation', ['quads'], [], true, LOW),
  // calf_raise
  ex('standing-calf-raise', '스탠딩 카프레이즈', 'calf_raise', 'isolation', ['calves'], [], true, LOW),
  ex('seated-calf-raise', '시티드 카프레이즈', 'calf_raise', 'isolation', ['calves'], [], false, LOW),
  ex('leg-press-calf-raise', '레그프레스 카프레이즈', 'calf_raise', 'isolation', ['calves'], [], false, LOW),
  // core
  ex('hanging-leg-raise', '행잉 레그레이즈', 'core', 'isolation', ['abs'], ['hip_flexors', 'obliques'], false, UP),
  ex('cable-crunch', '케이블 크런치', 'core', 'isolation', ['abs'], ['obliques'], false, UP),
  ex('ab-wheel-rollout', 'AB 롤아웃', 'core', 'isolation', ['abs'], ['lower_back'], true, UP),
]

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]))

export function getExercise(id: string): Exercise | undefined {
  return BY_ID.get(id)
}
