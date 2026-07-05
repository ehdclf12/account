import type { Role } from '@/types'

type UserInfo = { role: Role; name: string }

const BY_EMAIL: Record<string, UserInfo> = {
  'ehdclf12@naver.com': { role: 'husband', name: '동욱' },
  'tmxlclt@naver.com': { role: 'wife', name: '도영' },
}

export function userForEmail(email: string | null | undefined): UserInfo | null {
  if (!email) return null
  return BY_EMAIL[email.toLowerCase()] ?? null
}

export const NAME_BY_ROLE: Record<Role, string> = {
  husband: '동욱',
  wife: '도영',
}
