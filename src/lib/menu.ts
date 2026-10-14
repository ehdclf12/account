// 대시보드 왼쪽 메뉴바(SideMenu)의 메뉴. 메뉴를 늘릴 땐 여기만 고친다.
export interface MenuItem { to: string; label: string; desc: string }

export const MENU: MenuItem[] = [
  { to: '/', label: 'Dashboard', desc: '오늘의 그래프' },
  { to: '/calendar', label: 'Calendar', desc: '체크리스트 기한 한눈에' },
  { to: '/archive', label: 'Archive', desc: '메모 · 체크리스트 · 링크' },
  { to: '/time', label: 'Time', desc: '블럭으로 쌓는 내 시간' },
]
