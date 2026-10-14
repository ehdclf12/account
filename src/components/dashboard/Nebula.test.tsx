import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
})
