export type Theme = 'light' | 'dark'

const KEY = 'theme'
// 상태바 색(PWA). 라이트=흰 배경, 다크=진회색 배경.
const THEME_COLOR: Record<Theme, string> = { light: '#FFFFFF', dark: '#17171C' }

export function loadTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    // 사파리 프라이빗 모드 등에서 localStorage 접근이 막힐 수 있다. 앱이 죽지 않게 한다.
    return 'light'
  }
}

export function saveTheme(t: Theme): void {
  try { localStorage.setItem(KEY, t) } catch { /* 저장 실패해도 이번 세션은 동작한다 */ }
}

export function applyTheme(t: Theme): void {
  document.documentElement.dataset.theme = t
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLOR[t])
}
