// 아주 작은 토스트 store. 외부 의존성 없이 useSyncExternalStore로 구독한다.

export interface ToastMsg { id: number; text: string }

const DURATION_MS = 4000

let msgs: ToastMsg[] = []
let seq = 0
const listeners = new Set<() => void>()

function emit() {
  for (const fn of listeners) fn()
}

export function getToasts(): ToastMsg[] {
  return msgs
}

export function subscribeToasts(fn: () => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export function showToast(text: string): void {
  // 같은 문구가 연달아 뜨는 것(재시도 등)은 하나로 합친다
  if (msgs.some((m) => m.text === text)) return
  const id = ++seq
  msgs = [...msgs, { id, text }]
  emit()
  setTimeout(() => { dismissToast(id) }, DURATION_MS)
}

export function dismissToast(id: number): void {
  const next = msgs.filter((m) => m.id !== id)
  if (next.length === msgs.length) return
  msgs = next
  emit()
}

/** 테스트 전용 */
export function _resetToasts(): void {
  msgs = []
  seq = 0
  listeners.clear()
}
