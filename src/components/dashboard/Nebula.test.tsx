import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import Nebula from './Nebula'
import type { Dashboard, DashNode } from '@/lib/dashboard'

const none = { nodes: [], overflow: 0 }
function node(p: Partial<DashNode>): DashNode {
  return { id: 'n', domain: 'deadline', label: '세금신고', sub: 'D+1', urgency: 'hot', href: '/archive?item=a1', ...p }
}
function dash(p: Partial<Dashboard> = {}): Dashboard {
  return { deadline: none, calendar: none, time: none, archive: none, sameDay: [], empty: false, ...p }
}

describe('Nebula', () => {
  it('항목 노드를 누르면 그 주소로 이동한다', () => {
    const go = vi.fn()
    render(<Nebula dash={dash({ deadline: { nodes: [node({})], overflow: 0 } })} failed={{}} onNavigate={go} />)
    fireEvent.click(screen.getByRole('link', { name: '세금신고 D+1' }))
    expect(go).toHaveBeenCalledWith('/archive?item=a1')
  })
  it('Enter 키로도 이동한다', () => {
    const go = vi.fn()
    render(<Nebula dash={dash({ deadline: { nodes: [node({})], overflow: 0 } })} failed={{}} onNavigate={go} />)
    fireEvent.keyDown(screen.getByRole('link', { name: '세금신고 D+1' }), { key: 'Enter' })
    expect(go).toHaveBeenCalledWith('/archive?item=a1')
  })
  it('영역 노드: Deadline·Calendar는 /calendar, Archive는 /archive, Time은 /time', () => {
    const go = vi.fn()
    render(<Nebula dash={dash()} failed={{}} onNavigate={go} />)
    fireEvent.click(screen.getByRole('link', { name: 'Deadline →' }))
    fireEvent.click(screen.getByRole('link', { name: 'Calendar →' }))
    fireEvent.click(screen.getByRole('link', { name: 'Archive →' }))
    fireEvent.click(screen.getByRole('link', { name: 'Time →' }))
    expect(go.mock.calls.map((c) => c[0])).toEqual(['/calendar', '/calendar', '/archive', '/time'])
  })
  it('넘친 개수는 +N으로 보이고 누르면 영역 화면으로', () => {
    const go = vi.fn()
    render(<Nebula dash={dash({ archive: { nodes: [node({ id: 'p', domain: 'archive', label: '📌 레시피', sub: '', href: '/archive?item=p' })], overflow: 2 } })} failed={{}} onNavigate={go} />)
    expect(screen.getByText('+2')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Archive 더보기 +2' }))
    expect(go).toHaveBeenCalledWith('/archive')
  })
  it('비었으면 안내 문구', () => {
    render(<Nebula dash={dash({ empty: true })} failed={{}} onNavigate={() => {}} />)
    expect(screen.getByText('오늘은 비어 있어요')).toBeInTheDocument()
  })
  it('조회 실패한 영역에 실패 문구', () => {
    render(<Nebula dash={dash()} failed={{ time: true }} onNavigate={() => {}} />)
    expect(screen.getAllByText('불러오지 못했어요')).toHaveLength(1)
  })
  it('가운데 허브 라벨', () => {
    render(<Nebula dash={dash()} failed={{}} onNavigate={() => {}} />)
    expect(screen.getByText('나 · TODAY')).toBeInTheDocument()
  })

  describe('화면 크기 맞춤', () => {
    afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

    it('size를 주면 그 크기를 1px 단위 viewBox로 그린다', () => {
      const { container } = render(<Nebula dash={dash()} failed={{}} onNavigate={() => {}} size={{ w: 390, h: 760 }} />)
      expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 390 760')
    })
    it('잴 수 없으면(크기 0) 창 크기를 쓴다', () => {
      const { container } = render(<Nebula dash={dash()} failed={{}} onNavigate={() => {}} />)
      expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe(`0 0 ${window.innerWidth} ${window.innerHeight}`)
    })
    it('ResizeObserver로 담는 칸 크기를 재고, 바뀌면 다시 그린다', () => {
      let cb: (() => void) | undefined
      vi.stubGlobal('ResizeObserver', class {
        constructor(f: () => void) { cb = f }
        observe() {}
        disconnect() {}
      })
      let rect = { width: 500, height: 900 }
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ ...rect } as DOMRect))
      const { container } = render(<Nebula dash={dash()} failed={{}} onNavigate={() => {}} />)
      expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 500 900')
      rect = { width: 1000, height: 600 }
      act(() => cb!())
      expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 1000 600')
    })
    it('글자는 모두 11px 이상', () => {
      const d = dash({ deadline: { nodes: [node({})], overflow: 1 }, empty: false })
      const { container } = render(<Nebula dash={d} failed={{ time: true }} onNavigate={() => {}} size={{ w: 390, h: 760 }} />)
      const texts = container.querySelectorAll('text')
      expect(texts.length).toBeGreaterThan(0)
      for (const t of texts) expect(Number(t.getAttribute('font-size'))).toBeGreaterThanOrEqual(11)
    })
    it('먼지는 40개 남짓으로 줄인다', () => {
      const { container } = render(<Nebula dash={dash()} failed={{}} onNavigate={() => {}} size={{ w: 390, h: 760 }} />)
      const dots = container.querySelectorAll('[data-dust] circle')
      expect(dots.length).toBeGreaterThan(0)
      expect(dots.length).toBeLessThanOrEqual(40)
    })
    it('자리가 모자라면 들어가는 만큼만 보이고 나머지는 +N에 더한다', () => {
      const nodes = Array.from({ length: 5 }, (_, i) => node({ id: `d${i}`, label: `할일${i}`, sub: 'D-1', urgency: 'near', href: `/archive?item=${i}` }))
      render(<Nebula dash={dash({ deadline: { nodes, overflow: 2 } })} failed={{}} onNavigate={() => {}} size={{ w: 844, h: 360 }} />)
      expect(screen.getAllByRole('link', { name: /^할일\d D-1$/ })).toHaveLength(4)
      expect(screen.getByRole('link', { name: 'Deadline 더보기 +3' })).toBeInTheDocument()
      expect(screen.getByText('+3')).toBeInTheDocument()
    })
    it('누름은 겹치지 않는 투명 사각형만 받는다 (후광·글자는 누름을 받지 않음)', () => {
      render(<Nebula dash={dash({ deadline: { nodes: [node({})], overflow: 1 } })} failed={{}} onNavigate={() => {}} size={{ w: 390, h: 760 }} />)
      for (const link of screen.getAllByRole('link')) {
        const rect = link.querySelector(':scope > rect')!
        expect(Number(rect.getAttribute('height'))).toBeGreaterThanOrEqual(28)
        expect(Number(rect.getAttribute('width'))).toBeGreaterThanOrEqual(44)
        expect(link.querySelector(':scope > g')!.getAttribute('pointer-events')).toBe('none')
      }
    })
    it('긴 라벨은 잘라 보여도 읽어 주는 이름은 그대로', () => {
      const long = node({ label: '가나다라마바사아', sub: '아주아주긴공휴일이름 · 3건' })
      render(<Nebula dash={dash({ deadline: { nodes: [long], overflow: 0 } })} failed={{}} onNavigate={() => {}} size={{ w: 390, h: 760 }} />)
      expect(screen.getByRole('link', { name: '가나다라마바사아 아주아주긴공휴일이름 · 3건' })).toBeInTheDocument()
      expect(screen.getByText('가나다라마바사아')).toBeInTheDocument()
    })
  })
})
