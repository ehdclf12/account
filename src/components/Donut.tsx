export const CAT_COLORS = ['#2a78d6', '#1baf7a', '#eda100', '#008300', '#4a3aa7', '#e34948', '#e87ba4']
export const ETC_COLOR = '#8B95A1'

export default function Donut({ slices, centerLabel }: { slices: { color: string; pct: number }[]; centerLabel?: string }) {
  const R = 60, SW = 22, C = 2 * Math.PI * R
  let offset = 0
  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      <g transform="translate(80,80) rotate(-90)">
        <circle r={R} fill="none" stroke="rgb(var(--card))" strokeWidth={SW} />
        {slices.map((s, i) => {
          const len = Math.max(0, s.pct * C - 2) // 2px 간격
          const el = (
            <circle key={i} r={R} fill="none" stroke={s.color} strokeWidth={SW}
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} strokeLinecap="butt" />
          )
          offset += s.pct * C
          return el
        })}
      </g>
      {centerLabel && (
        <text x="80" y="84" textAnchor="middle" fontSize="15" fontWeight="700" fill="rgb(var(--ink))">{centerLabel}</text>
      )}
    </svg>
  )
}
