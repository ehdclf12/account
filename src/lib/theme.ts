export type Theme = 'light' | 'dark'

// 앱은 다크로 고정한다(홈 대시보드 디자인). 상태바 색(PWA)도 함께 맞춘다.
const THEME_COLOR: Record<Theme, string> = { light: '#FFFFFF', dark: '#17171C' }

export function applyTheme(t: Theme): void {
  document.documentElement.dataset.theme = t
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLOR[t])
}
