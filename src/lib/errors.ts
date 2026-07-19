// 저장 실패를 사용자가 이해할 수 있는 한 문장으로 바꾼다.
// 지금까지는 mutation이 실패해도 아무 표시가 없어, 시트가 안 닫히는 것으로만
// 드러났다(그리고 사용자는 중복 입력을 시도하게 된다).

const GENERIC = '저장하지 못했어요. 잠시 후 다시 시도해 주세요.'

const BY_CODE: Record<string, string> = {
  // 앱은 새 컬럼을 쓰는데 마이그레이션이 실행되지 않은 상태
  '42703': '앱이 기대하는 DB 항목이 없어요. 마이그레이션 실행이 필요합니다.',
  PGRST204: '앱이 기대하는 DB 항목이 없어요. 마이그레이션 실행이 필요합니다.',
  '23514': '입력한 값이 조건에 맞지 않아요.',
  '23505': '이미 등록된 항목이에요.',
  '23503': '다른 곳에서 사용 중이라 삭제할 수 없어요.',
  '42501': '권한이 없어요. 다시 로그인해 주세요.',
}

export function errorMessage(e: unknown): string {
  if (!e || typeof e !== 'object') return GENERIC

  const code = (e as { code?: unknown }).code
  if (typeof code === 'string' && BY_CODE[code]) return BY_CODE[code]

  // fetch 실패는 TypeError로 온다
  const msg = (e as { message?: unknown }).message
  if (typeof msg === 'string' && /failed to fetch|networkerror|load failed/i.test(msg)) {
    return '네트워크 연결을 확인해 주세요.'
  }

  return GENERIC
}
