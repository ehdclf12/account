import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { DOMAINS, type Dashboard, type DashNode, type Domain } from '@/lib/dashboard'
import {
  ITEM, DOMAIN_FONT, HUB_FONT, EMPTY_FONT, FAILED_FONT, CAPTION_FONT, HUB_LABEL, EMPTY_TEXT, SAME_DAY_TEXT,
  layoutNebula, makeDust, labelWidth, fitText, sameDayCaption,
  type Counts, type Pt, type Rect, type Size, type Slot,
} from '@/lib/nebula'

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
const INK = '#F2F7FF'
const BACKING = 'rgba(0,0,0,0.55)'
const FONT = 'ui-monospace, Menlo, monospace'

// 흐린 후광: 필터 대신 색 → 투명 방사형 그라데이션으로 그린다 (iOS에서 매 프레임 블러 계산을 피함)
const HALO_KEYS = ['hub', 'hot', ...DOMAINS] as const
type HaloKey = (typeof HALO_KEYS)[number]
const HALO_COLOR: Record<HaloKey, string> = { hub: HUB_COLOR, hot: HOT, ...COLOR }
const halo = (k: HaloKey) => `url(#nb-halo-${k})`

const EMPTY_COUNTS = Object.fromEntries(DOMAINS.map((d) => [d, { nodes: 0, overflow: 0 }])) as Counts

const RADIUS: Record<DashNode['urgency'], number> = { hot: 5, near: 4.5, far: 3.5, live: 4.8, calm: 4 }

interface Props {
  dash: Dashboard
  failed: Partial<Record<Domain, boolean>>
  onNavigate: (href: string) => void
  // 테스트용 고정 크기. 없으면 담는 칸을 잰다.
  size?: Size
}

// 글자 뒤 반투명 검은 배경 (먼지·연결선 위에서도 읽히게)
function Backing({ box, pad = 4 }: { box: Rect; pad?: number }) {
  return (
    <rect x={box.x1 - pad} y={box.y1 - pad / 2} width={box.x2 - box.x1 + pad * 2} height={box.y2 - box.y1 + pad}
      rx={5} fill={BACKING} />
  )
}

// 누를 수 있는 영역. 탭 영역 사각형은 배치 계산이 정한 것(겹치지 않음)을 그대로 깐다.
function Tap({ label, onGo, hit, children }: { label: string; onGo: () => void; hit: Rect; children: ReactNode }) {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onGo() } }
  return (
    <g role="link" tabIndex={0} aria-label={label} onClick={onGo} onKeyDown={onKey} style={{ cursor: 'pointer', outline: 'none' }}>
      <rect x={hit.x1} y={hit.y1} width={hit.x2 - hit.x1} height={hit.y2 - hit.y1} fill="transparent" />
      {/* 안의 원·글자는 누름을 받지 않는다: 후광이 이웃 탭 영역을 덮지 않게 */}
      <g pointerEvents="none">{children}</g>
    </g>
  )
}

// 항목 줄의 제목·부제를 폭에 맞춰 자르고, 둘을 감싸는 배경 상자를 구한다
function rowText(s: Slot, maxW: number, label: string, sub: string) {
  const l = fitText(label, ITEM.size, maxW)
  const su = sub ? fitText(sub, ITEM.subSize, maxW) : ''
  const w = Math.max(labelWidth(l, ITEM.size), su ? labelWidth(su, ITEM.subSize) : 0)
  const x1 = s.anchor === 'end' ? s.textX - w : s.textX
  const box: Rect = { x1, x2: x1 + w, y1: s.labelY - ITEM.size * 0.8, y2: su ? s.subY + ITEM.subSize * 0.2 : s.labelY + ITEM.size * 0.2 }
  return { l, su, box }
}

function useContainerSize(fixed?: Size) {
  const ref = useRef<HTMLDivElement>(null)
  const [measured, setMeasured] = useState<Size | null>(null)
  useLayoutEffect(() => {
    if (fixed) return
    const el = ref.current
    if (!el) return
    // 아직 크기가 안 잡혔으면(0) 창 크기로 대신한다
    const read = () => {
      const r = el.getBoundingClientRect()
      const w = Math.floor(r.width || window.innerWidth)
      const h = Math.floor(r.height || window.innerHeight)
      setMeasured((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }))
    }
    read()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', read)
      return () => window.removeEventListener('resize', read)
    }
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [fixed])
  return { ref, size: fixed ?? measured }
}

export default function Nebula({ dash, failed, onNavigate, size: fixedSize }: Props) {
  const { ref, size } = useContainerSize(fixedSize)
  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {size && size.w > 0 && size.h > 0 && (
        <Graph dash={dash} failed={failed} onNavigate={onNavigate} size={size} />
      )}
    </div>
  )
}

function Graph({ dash, failed, onNavigate, size }: Props & { size: Size }) {
  const { w: W, h: H } = size
  // 배치 계산은 산수뿐이라 매 렌더 다시 한다
  const counts = Object.fromEntries(DOMAINS.map((d) => [d, { nodes: dash[d].nodes.length, overflow: dash[d].overflow }])) as Counts
  const L = layoutNebula({ w: W, h: H }, counts)
  const hub = L.hub

  // 장식 먼지: 허브 24개 + 영역마다 4개. 영역 자리는 크기로만 정해지므로 크기가 바뀔 때만 다시 만든다.
  const dust = useMemo(() => {
    const at = layoutNebula({ w: W, h: H }, EMPTY_COUNTS)
    return {
      hub: makeDust(1, at.hub, Math.min(W, H) * 0.3, 24),
      ...Object.fromEntries(DOMAINS.map((d, i) => [d, makeDust(10 + i, at.domains[d].c, 34, 4)])),
    } as Record<'hub' | Domain, ReturnType<typeof makeDust>>
  }, [W, H])

  // 같은 날 연결선을 그리려고 노드 id → 줄 자리를 모은다
  const placed = new Map<string, Slot>()
  for (const d of DOMAINS) {
    L.domains[d].slots.forEach((s, k) => placed.set(dash[d].nodes[k].id, s))
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}
      style={{ display: 'block', position: 'absolute', inset: 0, fontFamily: FONT }} aria-label="오늘의 그래프">
      <defs>
        <filter id="nb-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
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
      <g aria-hidden="true" pointerEvents="none" data-dust="">
        {(['hub', ...DOMAINS] as const).map((k) => {
          const color = k === 'hub' ? '#7fe8ff' : COLOR[k]
          return (
            <g key={k}>
              {dust[k].links.map((l, i) => (
                <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={color} strokeWidth={0.5} opacity={l.o} />
              ))}
              {dust[k].dots.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={color} opacity={p.o} className={p.twinkle ? 'nb-twinkle' : undefined} />
              ))}
            </g>
          )
        })}
      </g>

      {/* 허브 → 영역 화살표: 영역 노드 고리 바로 앞에서 멈춘다 */}
      <g aria-hidden="true" pointerEvents="none">
        {DOMAINS.map((d) => {
          const c = L.domains[d].c
          const len = Math.hypot(c.x - hub.x, c.y - hub.y) || 1
          const k = Math.max(0, (len - 16) / len)
          return (
            <line key={d} x1={hub.x} y1={hub.y} x2={hub.x + (c.x - hub.x) * k} y2={hub.y + (c.y - hub.y) * k}
              stroke={LINE} strokeWidth={1.2} opacity={0.6} markerEnd="url(#nb-arrow)" />
          )
        })}
      </g>

      {/* 허브: 원 + 사각 프레임 */}
      <g aria-hidden="true" pointerEvents="none">
        <rect x={hub.x - 34} y={hub.y - 30} width={68} height={60} fill="none" stroke={LINE} strokeWidth={1} opacity={0.5} />
        <path d={`M${hub.x - 7} ${hub.y - 40} H${hub.x + 7} M${hub.x} ${hub.y - 45} V${hub.y - 30} M${hub.x - 7} ${hub.y + 40} H${hub.x + 7} M${hub.x} ${hub.y + 30} V${hub.y + 45}`}
          stroke={LINE} strokeWidth={1} opacity={0.6} />
        <circle cx={hub.x} cy={hub.y} r={52} fill={halo('hub')} opacity={0.2} />
        <circle cx={hub.x} cy={hub.y} r={14} fill={HUB_COLOR} filter="url(#nb-glow)" />
        <circle cx={hub.x} cy={hub.y} r={23} fill="none" stroke={HUB_COLOR} strokeWidth={1} opacity={0.7} />
        <text x={hub.x} y={L.hubLabelY} textAnchor="middle" fontSize={HUB_FONT} fontWeight={600} fill={INK}>{HUB_LABEL}</text>
        {dash.empty && (
          <>
            <Backing box={L.emptyBox} pad={6} />
            <text x={hub.x} y={L.emptyY} textAnchor="middle" fontSize={EMPTY_FONT} fill="#C9D6E2">{EMPTY_TEXT}</text>
          </>
        )}
      </g>

      {/* 같은 날 연결 */}
      <g aria-hidden="true" pointerEvents="none">
        {dash.sameDay.map(([a, b]) => {
          const p = placed.get(a), q = placed.get(b)
          if (!p || !q) return null
          // 문구는 라벨 반대편(허브 쪽) 옆에 둔다. 라벨은 바깥쪽에 붙으므로 겹치지 않는다.
          const cap = sameDayCaption(p, q, L.domains.deadline.inward)
          return (
            <g key={`${a}-${b}`}>
              <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#a98bff" strokeWidth={1.2} strokeDasharray="4 3" />
              <text x={cap.x} y={cap.y} textAnchor={cap.anchor} fontSize={CAPTION_FONT} fill="#cdbbff">{SAME_DAY_TEXT}</text>
            </g>
          )
        })}
      </g>

      {DOMAINS.map((d) => {
        const dl = L.domains[d]
        const c = dl.c
        const nodes = dash[d].nodes.slice(0, dl.visible)
        const title = `${TITLE[d]} →`
        const titleW = labelWidth(title, DOMAIN_FONT)
        return (
          <g key={d}>
            {/* 영역 → 항목 연결선: 라벨 아래에 깔리도록 먼저 그린다 */}
            <g aria-hidden="true" pointerEvents="none">
              {nodes.map((n, k) => {
                const p: Pt = dl.slots[k]
                return <line key={n.id} x1={c.x} y1={c.y} x2={p.x} y2={p.y} stroke={n.urgency === 'hot' ? HOT : COLOR[d]} strokeWidth={0.9} opacity={0.55} />
              })}
            </g>
            {/* 영역 노드 */}
            <Tap label={title} onGo={() => onNavigate(DOMAIN_HREF[d])} hit={dl.hit}>
              <circle cx={c.x} cy={c.y} r={30} fill={halo(d)} opacity={0.22} />
              <circle cx={c.x} cy={c.y} r={7} fill={COLOR[d]} filter="url(#nb-glow)" />
              <circle cx={c.x} cy={c.y} r={12} fill="none" stroke={COLOR[d]} strokeWidth={1} opacity={0.7} />
              <Backing box={{ x1: c.x - titleW / 2, x2: c.x + titleW / 2, y1: dl.labelY - DOMAIN_FONT * 0.8, y2: dl.labelY + DOMAIN_FONT * 0.2 }} />
              <text x={c.x} y={dl.labelY} textAnchor="middle" fontSize={DOMAIN_FONT} fontWeight={700} fill={INK}>{title}</text>
            </Tap>
            {failed[d] && (
              <text x={c.x} y={dl.failedY} textAnchor="middle" fontSize={FAILED_FONT} fill="#C9D6E2" pointerEvents="none">불러오지 못했어요</text>
            )}

            {/* 항목 노드 */}
            {nodes.map((n, k) => {
              const s = dl.slots[k]
              const color = n.urgency === 'hot' ? HOT : COLOR[d]
              const r = RADIUS[n.urgency]
              // 움직이는 노드는 필터 없는 덧그림 원만 움직이고, 빛나는(필터) 원은 가만히 둔다
              const cls = n.urgency === 'hot' ? 'nb-blink' : n.urgency === 'live' ? 'nb-pulse' : undefined
              const t = rowText(s, L.textW, n.label, n.sub)
              return (
                <Tap key={n.id} label={n.sub ? `${n.label} ${n.sub}` : n.label} onGo={() => onNavigate(n.href)} hit={s.hit}>
                  <circle cx={s.x} cy={s.y} r={r * 2.6 + 8} fill={halo(n.urgency === 'hot' ? 'hot' : d)} opacity={0.22} />
                  <circle cx={s.x} cy={s.y} r={r} fill={color} filter="url(#nb-glow)"
                    opacity={n.urgency === 'far' ? 0.55 : n.urgency === 'hot' ? 0.45 : 1} />
                  {cls && <circle cx={s.x} cy={s.y} r={r} fill={color} opacity={n.urgency === 'live' ? 0.5 : 1} className={cls} />}
                  <Backing box={t.box} />
                  <text x={s.textX} y={s.labelY} textAnchor={s.anchor} fontSize={ITEM.size}
                    fill={INK}>{t.l}</text>
                  {t.su && <text x={s.textX} y={s.subY} textAnchor={s.anchor} fontSize={ITEM.subSize} fill={color}>{t.su}</text>}
                </Tap>
              )
            })}

            {/* 넘침 +N (원래 넘친 것 + 자리가 없어 숨긴 것) */}
            {dl.more && (() => {
              const s = dl.more
              const t = rowText(s, L.textW, `+${dl.moreCount}`, '')
              return (
                <Tap label={`${TITLE[d]} 더보기 +${dl.moreCount}`} onGo={() => onNavigate(DOMAIN_HREF[d])} hit={s.hit}>
                  <circle cx={s.x} cy={s.y} r={3} fill={COLOR[d]} opacity={0.7} />
                  <Backing box={t.box} />
                  <text x={s.textX} y={s.labelY} textAnchor={s.anchor} fontSize={ITEM.size} fill={COLOR[d]}>{t.l}</text>
                </Tap>
              )
            })()}
          </g>
        )
      })}
    </svg>
  )
}
