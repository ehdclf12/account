import { describe, it, expect } from 'vitest'
import { errorMessage } from './errors'

describe('errorMessage', () => {
  it('스키마 불일치(없는 컬럼)는 DB 갱신 필요를 안내', () => {
    // 마이그레이션을 실행하지 않은 채 배포됐을 때 실제로 오는 코드
    expect(errorMessage({ code: '42703', message: `column "done" does not exist` }))
      .toContain('DB')
    expect(errorMessage({ code: 'PGRST204', message: 'column not found' }))
      .toContain('DB')
  })
  it('체크 제약 위반', () => {
    expect(errorMessage({ code: '23514', message: 'violates check constraint' }))
      .toBe('입력한 값이 조건에 맞지 않아요.')
  })
  it('중복 값', () => {
    expect(errorMessage({ code: '23505', message: 'duplicate key' }))
      .toBe('이미 등록된 항목이에요.')
  })
  it('연결된 데이터가 있어 삭제 불가', () => {
    expect(errorMessage({ code: '23503', message: 'foreign key violation' }))
      .toBe('다른 곳에서 사용 중이라 삭제할 수 없어요.')
  })
  it('권한 없음(RLS)', () => {
    expect(errorMessage({ code: '42501', message: 'permission denied' }))
      .toBe('권한이 없어요. 다시 로그인해 주세요.')
  })
  it('네트워크 실패', () => {
    expect(errorMessage(new TypeError('Failed to fetch')))
      .toBe('네트워크 연결을 확인해 주세요.')
  })
  it('알 수 없는 오류는 일반 문구', () => {
    expect(errorMessage(new Error('boom'))).toBe('저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
    expect(errorMessage(null)).toBe('저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
    expect(errorMessage(undefined)).toBe('저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
  })
})
