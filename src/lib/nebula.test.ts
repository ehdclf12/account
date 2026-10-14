import { describe, it, expect } from 'vitest'
import { DOMAINS, type Domain } from './dashboard'
import {
  mulberry32, makeDust, labelWidth, fitText, layoutNebula, sameDayCaption, textBox, overlaps,
  ITEM, type Rect, type Counts,
} from './nebula'

describe('mulberry32', () => {
  it('같은 시드 → 같은 수열', () => {
    const a = mulberry32(7), b = mulberry32(7)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
  it('0 이상 1 미만', () => {
    const r = mulberry32(1)
    for (let i = 0; i < 100; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('makeDust', () => {
  const c = { x: 100, y: 100 }
  it('같은 시드면 렌더마다 같은 모양', () => {
    expect(makeDust(3, c, 100, 24)).toEqual(makeDust(3, c, 100, 24))
  })
  it('시드가 다르면 다른 모양', () => {
    expect(makeDust(3, c, 100, 24)).not.toEqual(makeDust(4, c, 100, 24))
  })
  it('개수·범위·흐린 정도', () => {
    const { dots, links } = makeDust(5, c, 50, 30)
    expect(dots).toHaveLength(30)
    expect(links.length).toBeLessThan(30 / 2)
    for (const d of dots) {
      expect(Math.hypot(d.x - c.x, d.y - c.y)).toBeLessThanOrEqual(50.5)
      expect(d.o).toBeLessThanOrEqual(0.35)
    }
    for (const l of links) expect(l.o).toBeLessThanOrEqual(0.35)
  })
})

describe('labelWidth', () => {
  it('한글·이모지는 1em, 나머지는 0.6em', () => {
    expect(labelWidth('가나', 6)).toBeCloseTo(12)
    expect(labelWidth('ab', 10)).toBeCloseTo(12)
    expect(labelWidth('📌 가', 10)).toBeCloseTo(26)
  })
})

describe('fitText', () => {
  it('들어가면 그대로', () => {
    expect(fitText('가나다', 10, 30)).toBe('가나다')
  })
  it('넘치면 줄이고 … 를 붙여 폭 안에 넣는다', () => {
    const t = fitText('가나다라마바', 10, 35)
    expect(t).toBe('가나…')
    expect(labelWidth(t, 10)).toBeLessThanOrEqual(35)
  })
})

// 화면 크기별 수용 시험: 모든 영역이 최대 개수 + 넘침인 최악의 경우
const SIZES = [
  { name: 'iPhone 세로', w: 390, h: 760 },
  { name: '작은 폰', w: 375, h: 600 },
  { name: 'iPad 세로', w: 744, h: 1100 },
  { name: 'iPad 가로', w: 1133, h: 744 },
  { name: '폰 가로', w: 844, h: 360 },
]
const WORST: Counts = {
  deadline: { nodes: 5, overflow: 2 },
  calendar: { nodes: 3, overflow: 1 },
  time: { nodes: 4, overflow: 1 },
  archive: { nodes: 3, overflow: 1 },
}
const LABEL = '가나다라마바사아'
const SUB = '자차카타파하'

interface Owned { owner: string; box: Rect }

function textBoxes(size: { w: number; h: number }, counts: Counts) {
  const L = layoutNebula(size, counts)
  const texts: Owned[] = []
  const hits: Owned[] = []
  const domainLabels: Owned[] = []
  for (const d of DOMAINS) {
    const dl = L.domains[d]
    domainLabels.push({ owner: `${d}`, box: dl.labelBox })
    hits.push({ owner: `${d}`, box: dl.hit })
    dl.slots.forEach((s, k) => {
      const lw = labelWidth(fitText(LABEL, ITEM.size, L.textW), ITEM.size)
      const sw = labelWidth(fitText(SUB, ITEM.subSize, L.textW), ITEM.subSize)
      texts.push({ owner: `${d}-${k}`, box: textBox(s.textX, s.anchor, lw, s.labelY, ITEM.size) })
      texts.push({ owner: `${d}-${k}`, box: textBox(s.textX, s.anchor, sw, s.subY, ITEM.subSize) })
      hits.push({ owner: `${d}-${k}`, box: s.hit })
    })
    if (dl.more) {
      const s = dl.more
      const w = labelWidth(`+${dl.moreCount}`, ITEM.size)
      texts.push({ owner: `${d}-more`, box: textBox(s.textX, s.anchor, w, s.labelY, ITEM.size) })
      hits.push({ owner: `${d}-more`, box: s.hit })
    }
  }
  return { L, texts, hits, domainLabels }
}

const inside = (b: Rect, w: number, h: number) => b.x1 >= 0 && b.y1 >= 0 && b.x2 <= w && b.y2 <= h

describe('layoutNebula', () => {
  for (const sz of SIZES) {
    describe(`${sz.name} ${sz.w}×${sz.h}`, () => {
      const { L, texts, hits, domainLabels } = textBoxes(sz, WORST)

      it('가로/세로 배치는 W/H > 1.1 일 때만 가로', () => {
        expect(L.orientation).toBe(sz.w / sz.h > 1.1 ? 'landscape' : 'portrait')
      })

      it('다른 노드의 라벨·부제 상자끼리 겹치지 않고, 영역 이름과도 겹치지 않는다', () => {
        for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
          if (texts[i].owner === texts[j].owner) continue
          expect(overlaps(texts[i].box, texts[j].box), `${texts[i].owner} × ${texts[j].owner}`).toBe(false)
        }
        for (const t of texts) for (const d of domainLabels) {
          expect(overlaps(t.box, d.box), `${t.owner} × ${d.owner} 이름`).toBe(false)
        }
      })

      it('허브 이름·빈 안내·실패 문구가 다른 글자와 겹치지 않는다', () => {
        const others = [...texts, ...domainLabels]
        for (const b of [L.hubLabelBox, L.emptyBox]) {
          for (const t of others) expect(overlaps(b, t.box), t.owner).toBe(false)
        }
        for (const d of DOMAINS) {
          for (const t of texts) expect(overlaps(L.domains[d].failedBox, t.box), `${d} 실패 × ${t.owner}`).toBe(false)
        }
      })

      it('모든 글자 상자와 탭 영역이 화면 안에 있다', () => {
        for (const t of [...texts, ...hits, ...domainLabels]) {
          expect(inside(t.box, sz.w, sz.h), `${t.owner} ${JSON.stringify(t.box)}`).toBe(true)
        }
        for (const b of [L.hubLabelBox, L.emptyBox]) expect(inside(b, sz.w, sz.h)).toBe(true)
      })

      it('탭 영역은 28px 이상 높이·44px 이상 폭이고 서로 겹치지 않는다', () => {
        for (const h of hits) {
          expect(h.box.y2 - h.box.y1, h.owner).toBeGreaterThanOrEqual(28)
          expect(h.box.x2 - h.box.x1, h.owner).toBeGreaterThanOrEqual(44)
        }
        for (let i = 0; i < hits.length; i++) for (let j = i + 1; j < hits.length; j++) {
          expect(overlaps(hits[i].box, hits[j].box), `${hits[i].owner} × ${hits[j].owner}`).toBe(false)
        }
      })

      it('가로 배치에서 왼쪽 영역 항목은 영역보다 왼쪽, 오른쪽 영역 항목은 오른쪽', () => {
        if (L.orientation !== 'landscape') return
        for (const d of DOMAINS) {
          const dl = L.domains[d]
          const all = dl.more ? [...dl.slots, dl.more] : dl.slots
          for (const s of all) {
            if (dl.side === 'left') expect(s.x).toBeLessThan(dl.c.x)
            else expect(s.x).toBeGreaterThan(dl.c.x)
          }
        }
      })

      it('보이는 개수 + 숨긴 개수 = 전체', () => {
        for (const d of DOMAINS) {
          const dl = L.domains[d]
          expect(dl.slots.length).toBe(dl.visible)
          expect(dl.visible + dl.moreCount).toBe(WORST[d].nodes + WORST[d].overflow)
          expect(dl.more !== null).toBe(dl.moreCount > 0)
        }
      })

      it('같은 날 문구는 어떤 라벨과도 겹치지 않는다', () => {
        const s = L.domains.deadline.slots
        for (let k = 1; k < s.length; k++) {
          const cap = sameDayCaption(s[k - 1], s[k], L.domains.deadline.inward)
          for (const t of [...texts, ...domainLabels]) expect(overlaps(cap.box, t.box), t.owner).toBe(false)
          expect(inside(cap.box, sz.w, sz.h)).toBe(true)
        }
      })
    })
  }

  it('자리가 남으면 다 보이고, 넘침이 없으면 +N 칸도 없다', () => {
    const counts: Counts = {
      deadline: { nodes: 2, overflow: 0 }, calendar: { nodes: 0, overflow: 0 },
      time: { nodes: 1, overflow: 0 }, archive: { nodes: 3, overflow: 2 },
    }
    const L = layoutNebula({ w: 390, h: 760 }, counts)
    expect(L.domains.deadline.visible).toBe(2)
    expect(L.domains.deadline.more).toBeNull()
    expect(L.domains.calendar.slots).toEqual([])
    expect(L.domains.archive.visible).toBe(3)
    expect(L.domains.archive.moreCount).toBe(2)
  })

  it('자리가 모자라면 들어가는 만큼만 보이고 나머지는 +N에 더한다', () => {
    const L = layoutNebula({ w: 844, h: 360 }, WORST)
    const dl = L.domains.deadline
    expect(dl.visible).toBeLessThan(5)
    expect(dl.moreCount).toBe(5 - dl.visible + 2)
  })

  it('세로: 위 영역은 허브 위, 아래 영역은 허브 아래, 왼쪽/오른쪽으로 나뉜다', () => {
    const L = layoutNebula({ w: 390, h: 760 }, WORST)
    const P = (d: Domain) => L.domains[d].c
    expect(P('deadline').y).toBeLessThan(L.hub.y)
    expect(P('calendar').y).toBeLessThan(L.hub.y)
    expect(P('archive').y).toBeGreaterThan(L.hub.y)
    expect(P('time').y).toBeGreaterThan(L.hub.y)
    expect(P('deadline').x).toBeLessThan(L.hub.x)
    expect(P('archive').x).toBeLessThan(L.hub.x)
    expect(P('calendar').x).toBeGreaterThan(L.hub.x)
    expect(P('time').x).toBeGreaterThan(L.hub.x)
  })
})
