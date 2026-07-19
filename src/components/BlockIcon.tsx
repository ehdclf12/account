// 블럭 아이콘 세트.
//
// 애플 SF Symbols는 라이선스상 웹앱에 쓸 수 없어, 같은 결(24x24 스트로크)로
// 직접 그린 것들이다. 외부 아이콘 라이브러리를 들이지 않아 의존성이 0이고
// 번들에도 몇 KB만 더해진다.
//
// 키를 못 찾으면 문자열을 그대로 그린다 — 이모지로 만들어둔 기존 블럭도 깨지지 않는다.

const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const BLOCK_ICONS: { key: string; label: string; el: React.ReactNode }[] = [
  { key: 'book', label: '독서', el: <><path {...S} d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2z" /><path {...S} d="M8 3v18" /></> },
  { key: 'pencil', label: '기록', el: <><path {...S} d="M4 20h4L20 8l-4-4L4 16z" /><path {...S} d="M15 5l4 4" /></> },
  { key: 'code', label: '개발', el: <><path {...S} d="M9 8l-5 4 5 4" /><path {...S} d="M15 8l5 4-5 4" /></> },
  { key: 'graduation', label: '공부', el: <><path {...S} d="M2 9l10-5 10 5-10 5z" /><path {...S} d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" /></> },
  { key: 'briefcase', label: '업무', el: <><rect {...S} x="3" y="7" width="18" height="13" rx="2" /><path {...S} d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></> },
  { key: 'dumbbell', label: '운동', el: <><path {...S} d="M4 9v6M7 7v10M17 7v10M20 9v6" /><path {...S} d="M7 12h10" /></> },
  { key: 'run', label: '달리기', el: <><circle {...S} cx="15" cy="4.5" r="2" /><path {...S} d="M13 21l2-6-4-3 1-5 3 3 3 1" /><path {...S} d="M11 12l-4 2-2 5" /></> },
  { key: 'heart', label: '건강', el: <path {...S} d="M12 20s-7-4.6-7-9.5A3.5 3.5 0 0 1 12 8a3.5 3.5 0 0 1 7 2.5C19 15.4 12 20 12 20z" /> },
  { key: 'meditate', label: '명상', el: <><circle {...S} cx="12" cy="5.5" r="2.5" /><path {...S} d="M12 10v6" /><path {...S} d="M4 20c0-3 3.6-4 8-4s8 1 8 4" /></> },
  { key: 'moon', label: '수면', el: <path {...S} d="M20 14A8.5 8.5 0 0 1 10 4a8.5 8.5 0 1 0 10 10z" /> },
  { key: 'utensils', label: '요리', el: <><path {...S} d="M6 3v8a2 2 0 0 0 4 0V3" /><path {...S} d="M8 11v10" /><path {...S} d="M17 3c-1.5 2-2 3.5-2 6h4c0-2.5-.5-4-2-6z" /><path {...S} d="M17 9v12" /></> },
  { key: 'cup', label: '커피', el: <><path {...S} d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" /><path {...S} d="M17 10h2a2 2 0 0 1 0 4h-2" /></> },
  { key: 'cart', label: '장보기', el: <><path {...S} d="M3 4h2l2.5 11h10L20 7H6" /><circle {...S} cx="9" cy="19" r="1.4" /><circle {...S} cx="17" cy="19" r="1.4" /></> },
  { key: 'home', label: '집안일', el: <><path {...S} d="M4 11l8-7 8 7" /><path {...S} d="M6 10v10h12V10" /></> },
  { key: 'monitor', label: '영상', el: <><rect {...S} x="3" y="4" width="18" height="12" rx="2" /><path {...S} d="M9 20h6M12 16v4" /></> },
  { key: 'music', label: '음악', el: <><path {...S} d="M9 18V5l10-2v13" /><circle {...S} cx="7" cy="18" r="2" /><circle {...S} cx="17" cy="16" r="2" /></> },
  { key: 'gamepad', label: '게임', el: <><rect {...S} x="2" y="7" width="20" height="10" rx="4" /><path {...S} d="M7 10v4M5 12h4" /><circle {...S} cx="16" cy="11" r="1" /><circle {...S} cx="18.5" cy="13.5" r="1" /></> },
  { key: 'palette', label: '취미', el: <><path {...S} d="M12 3a9 9 0 1 0 0 18c1.1 0 1.5-.8 1.5-1.5 0-1.4 1-2 2-2H18a3 3 0 0 0 3-3c0-6-4-11.5-9-11.5z" /><circle {...S} cx="8" cy="10" r="1" /><circle {...S} cx="12" cy="7.5" r="1" /><circle {...S} cx="16" cy="10" r="1" /></> },
  { key: 'camera', label: '사진', el: <><rect {...S} x="3" y="7" width="18" height="13" rx="2" /><path {...S} d="M9 7l1.5-3h3L15 7" /><circle {...S} cx="12" cy="13.5" r="3.2" /></> },
  { key: 'plane', label: '이동', el: <path {...S} d="M2 13l20-8-6 16-3.5-6z" /> },
  { key: 'chart', label: '분석', el: <><path {...S} d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></> },
  { key: 'target', label: '목표', el: <><circle {...S} cx="12" cy="12" r="8" /><circle {...S} cx="12" cy="12" r="4" /><circle {...S} cx="12" cy="12" r="1" /></> },
  { key: 'clock', label: '시간', el: <><circle {...S} cx="12" cy="12" r="8.5" /><path {...S} d="M12 7v5.5l3.5 2" /></> },
  { key: 'star', label: '기타', el: <path {...S} d="M12 3.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.8z" /> },
]

const BY_KEY = new Map(BLOCK_ICONS.map((i) => [i.key, i.el]))

export default function BlockIcon({ name, className = 'w-6 h-6' }: { name: string; className?: string }) {
  const el = BY_KEY.get(name)
  // 키가 아니면(이모지 등) 문자열 그대로
  if (!el) return <span className={`${className} inline-flex items-center justify-center text-xl leading-none`}>{name}</span>
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">{el}</svg>
  )
}
