import type { Role } from '@/types'

const K_ID = 'who', K_PIN = 'pin_ok'

export function getIdentity(): Role | null {
  const v = localStorage.getItem(K_ID)
  return v === 'husband' || v === 'wife' ? v : null
}
export function setIdentity(r: Role): void { localStorage.setItem(K_ID, r) }
export function isPinOk(): boolean { return localStorage.getItem(K_PIN) === '1' }
export function setPinOk(v: boolean): void {
  if (v) localStorage.setItem(K_PIN, '1'); else localStorage.removeItem(K_PIN)
}
