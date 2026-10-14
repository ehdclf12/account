import { useMemo } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { DOMAINS, type Dashboard, type DashNode, type Domain } from '@/lib/dashboard'
import { VIEW, HUB, DOMAIN_POS, LABEL, makeDust, arcPositions, labelPlacement, labelWidth, type Pt } from '@/lib/nebula'

const COLOR: Record<Domain, string> = {
  deadline: '#ff8a7e', calendar: '#8ef08a', archive: '#6cb6ff', time: '#a98bff',
}
const TITLE: Record<Domain, string> = {
  deadline: 'Deadline', calendar: 'Calendar', archive: 'Archive', time: 'Time',
}
// 기한만 따로 보는 화면이 없어서 Deadline은 기한을 날짜별로 모아 보는 Calendar로 보낸다
const DOMAIN_HREF: Record<Domain, string> = {
  deadline: '/calendar', calendar: '/calendar', archive: '/archive', time: '/time',
}
const HOT = '#ff6b6b'
const HUB_COLOR = '#d8f6ff'
const LINE = '#bfe9ff'
const FONT = 'ui-monospace, Menlo, monospace'

// 흐린 후광: 필터 대신 색 → 투명 방사형 그라데이션으로 그린다 (iOS에서 매 프레임 블러 계산을 피함)
const HALO_KEYS = ['hub', 'hot', ...DOMAINS] as const
type HaloKey = (typeof HALO_KEYS)[number]
const HALO_COLOR: Record<HaloKey, string> = { hub: HUB_COLOR, hot: HOT, ...COLOR }
const halo = (k: HaloKey) => `url(#nb-halo-${k})`

// 노드 옆 라벨: 제목·부제 중 긴 쪽이 화면 안에 들어오도록 자리를 잡는다
function labelSpot(center: Pt, p: Pt, label: string, sub?: string) {
  const w = Math.max(labelWidth(label, LABEL.size), sub ? labelWidth(sub, LABEL.subSize) : 0)
  const { x, anchor } = labelPlacement(center, p, w)
  return { x, anchor, span: anchor === 'end' ? { x1: x - w, x2: p.x } : { x1: p.x, x2: x + w } }
}

const RADIUS: Record<DashNode['urgency'], number> = { hot: 3.6, near: 3, far: 2.2, live: 3.2, calm: 2.6 }

interface Props {
  dash: Dashboard
  failed: Partial<Record<Domain, boolean>>
  onNavigate: (href: string) => void
}

interface Box { x1: number; x2: number }

// 누를 수 있는 영역. 실제 화면 기준 32px 이상이 되도록 투명 사각형을 깐다. span을 주면 라벨까지 가로로 넓힌다.
function Tap({ label, onGo, at, span, children }: { label: string; onGo: () => void; at: Pt; span?: Box; children: ReactNode }) {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onGo() } }
  const x1 = Math.min(at.x - 16, span?.x1 ?? Infinity), x2 = Math.max(at.x + 16, span?.x2 ?? -Infinity)
  return (
    <g role="link" tabIndex={0} aria-label={label} onClick={onGo} onKeyDown={onKey} style={{ cursor: 'pointer', outline: 'none' }}>
      <rect x={x1} y={at.y - 13} width={x2 - x1} height={26} fill="transparent" />
      {children}
    </g>
  )
}

export default function Nebula({ dash, failed, onNavigate }: Props) {
  const dust = useMemo(() => ({
    hub: makeDust(1, HUB, 110, 120),
    ...Object.fromEntries(DOMAINS.map((d, i) => [d, makeDust(10 + i, DOMAIN_POS[d], 34, 22)])),
  }) as Record<'hub' | Domain, ReturnType<typeof makeDust>>, [])

  // 같은 날 연결선을 그리려고 노드 id → 좌표를 모은다
  const placed = new Map<string, Pt>()
  for (const d of DOMAINS) {
    const { nodes, overflow } = dash[d]
    const ps = arcPositions(DOMAIN_POS[d], nodes.length + (overflow > 0 ? 1 : 0))
    nodes.forEach((n, k) => placed.set(n.id, ps[k]))
    if (overflow > 0) placed.set(`${d}-more`, ps[nodes.length])
  }

  return (
    <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} width="100%" style={{ display: 'block', fontFamily: FONT }} aria-label="오늘의 그래프">
      <defs>
        <filter id="nb-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {HALO_KEYS.map((k) => (
          <radialGradient key={k} id={`nb-halo-${k}`}>
            <stop offset="0%" stopColor={HALO_COLOR[k]} stopOpacity={1} />
            <stop offset="45%" stopColor={HALO_COLOR[k]} stopOpacity={0.55} />
            <stop offset="100%" stopColor={HALO_COLOR[k]} stopOpacity={0} />
          </radialGradient>
        ))}
        <marker id="nb-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L6 3 L0 6 Z" fill={LINE} />
        </marker>
      </defs>

      {/* 장식: 먼지 노드 (누를 수 없음) */}
      <g aria-hidden="true" pointerEvents="none">
        {(['hub', ...DOMAINS] as const).map((k) => {
          const color = k === 'hub' ? '#7fe8ff' : COLOR[k]
          return (
            <g key={k}>
              {dust[k].links.map((l, i) => (
                <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={color} strokeWidth={0.25} opacity={l.o} />
              ))}
              {dust[k].dots.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={color} opacity={p.o} className={p.twinkle ? 'nb-twinkle' : undefined} />
              ))}
            </g>
          )
        })}
      </g>

      {/* 허브 → 영역 화살표 */}
      <g aria-hidden="true" pointerEvents="none">
        {DOMAINS.map((d) => (
          <line key={d} x1={HUB.x} y1={HUB.y} x2={DOMAIN_POS[d].x} y2={DOMAIN_POS[d].y}
            stroke={LINE} strokeWidth={0.7} opacity={0.7} markerEnd="url(#nb-arrow)" />
        ))}
      </g>

      {/* 허브: 원 + 사각 프레임 */}
      <g aria-hidden="true" pointerEvents="none">
        <rect x={HUB.x - 30} y={HUB.y - 26} width={60} height={52} fill="none" stroke={LINE} strokeWidth={0.6} opacity={0.55} />
        <path d={`M${HUB.x - 6} ${HUB.y - 36} H${HUB.x + 6} M${HUB.x} ${HUB.y - 40} V${HUB.y - 26} M${HUB.x - 6} ${HUB.y + 36} H${HUB.x + 6} M${HUB.x} ${HUB.y + 26} V${HUB.y + 40}`}
          stroke={LINE} strokeWidth={0.7} opacity={0.7} />
        <circle cx={HUB.x} cy={HUB.y} r={42} fill={halo('hub')} opacity={0.2} />
        <circle cx={HUB.x} cy={HUB.y} r={12} fill={HUB_COLOR} filter="url(#nb-glow)" />
        <circle cx={HUB.x} cy={HUB.y} r={20} fill="none" stroke={HUB_COLOR} strokeWidth={0.7} opacity={0.7} />
        <text x={HUB.x} y={HUB.y + 36 + 14} textAnchor="middle" fontSize={7} fill="#eafaff">나 · TODAY</text>
        {dash.empty && (
          <text x={HUB.x} y={HUB.y + 64} textAnchor="middle" fontSize={6} fill="#7f97a8">오늘은 비어 있어요</text>
        )}
      </g>

      {/* 같은 날 연결 */}
      <g aria-hidden="true" pointerEvents="none">
        {dash.sameDay.map(([a, b]) => {
          const p = placed.get(a), q = placed.get(b)
          if (!p || !q) return null
          // 문구는 라벨 반대편(허브 쪽) 옆에 둔다. 라벨은 바깥쪽에 붙으므로 겹치지 않는다.
          const inward = p.x < HUB.x ? 1 : -1
          const x = (inward > 0 ? Math.max(p.x, q.x) : Math.min(p.x, q.x)) + inward * 6
          return (
            <g key={`${a}-${b}`}>
              <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#a98bff" strokeWidth={0.6} strokeDasharray="2 2" />
              <text x={x} y={(p.y + q.y) / 2 + 2} textAnchor={inward > 0 ? 'start' : 'end'} fontSize={5} fill="#cdbbff">⚡ 같은 날</text>
            </g>
          )
        })}
      </g>

      {DOMAINS.map((d) => {
        const c = DOMAIN_POS[d]
        const { nodes, overflow } = dash[d]
        const more = placed.get(`${d}-more`)
        return (
          <g key={d}>
            {/* 영역 → 항목 연결선: 라벨 아래에 깔리도록 먼저 그린다 */}
            <g aria-hidden="true" pointerEvents="none">
              {nodes.map((n) => {
                const p = placed.get(n.id)!
                return <line key={n.id} x1={c.x} y1={c.y} x2={p.x} y2={p.y} stroke={n.urgency === 'hot' ? HOT : COLOR[d]} strokeWidth={0.5} opacity={0.6} />
              })}
            </g>
            {/* 영역 노드 */}
            <Tap label={`${TITLE[d]} →`} onGo={() => onNavigate(DOMAIN_HREF[d])} at={c}>
              <circle cx={c.x} cy={c.y} r={22} fill={halo(d)} opacity={0.22} />
              <circle cx={c.x} cy={c.y} r={6} fill={COLOR[d]} filter="url(#nb-glow)" />
              <circle cx={c.x} cy={c.y} r={10} fill="none" stroke={COLOR[d]} strokeWidth={0.7} opacity={0.7} />
              <text x={c.x} y={c.y + 18} textAnchor="middle" fontSize={6.5} fill="#e6f4ff">{TITLE[d]} →</text>
            </Tap>
            {failed[d] && (
              <text x={c.x} y={c.y + 27} textAnchor="middle" fontSize={5.4} fill="#7f97a8">불러오지 못했어요</text>
            )}

            {/* 항목 노드 */}
            {nodes.map((n) => {
              const p = placed.get(n.id)!
              const color = n.urgency === 'hot' ? HOT : COLOR[d]
              const r = RADIUS[n.urgency]
              // 움직이는 노드는 필터 없는 덧그림 원만 움직이고, 빛나는(필터) 원은 가만히 둔다
              const cls = n.urgency === 'hot' ? 'nb-blink' : n.urgency === 'live' ? 'nb-pulse' : undefined
              const spot = labelSpot(c, p, n.label, n.sub)
              return (
                <Tap key={n.id} label={n.sub ? `${n.label} ${n.sub}` : n.label} onGo={() => onNavigate(n.href)} at={p} span={spot.span}>
                  <circle cx={p.x} cy={p.y} r={r * 2.6 + 8} fill={halo(n.urgency === 'hot' ? 'hot' : d)} opacity={0.22} />
                  <circle cx={p.x} cy={p.y} r={r} fill={color} filter="url(#nb-glow)"
                    opacity={n.urgency === 'far' ? 0.55 : n.urgency === 'hot' ? 0.45 : 1} />
                  {cls && <circle cx={p.x} cy={p.y} r={r} fill={color} opacity={n.urgency === 'live' ? 0.5 : 1} className={cls} />}
                  <text x={spot.x} y={p.y + LABEL.dy} textAnchor={spot.anchor} fontSize={LABEL.size} fill="#e6f4ff">{n.label}</text>
                  {n.sub && <text x={spot.x} y={p.y + LABEL.subDy} textAnchor={spot.anchor} fontSize={LABEL.subSize} fill={color}>{n.sub}</text>}
                </Tap>
              )
            })}

            {/* 넘침 +N */}
            {more && (() => {
              const spot = labelSpot(c, more, `+${overflow}`)
              return (
                <Tap label={`${TITLE[d]} 더보기 +${overflow}`} onGo={() => onNavigate(DOMAIN_HREF[d])} at={more} span={spot.span}>
                  <circle cx={more.x} cy={more.y} r={2} fill={COLOR[d]} opacity={0.6} />
                  <text x={spot.x} y={more.y + LABEL.dy} textAnchor={spot.anchor} fontSize={LABEL.size} fill={COLOR[d]}>+{overflow}</text>
                </Tap>
              )
            })()}
          </g>
        )
      })}
    </svg>
  )
}
