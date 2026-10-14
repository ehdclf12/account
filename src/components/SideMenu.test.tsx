import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SideMenu from './SideMenu'

function setup(open = true) {
  const props = {
    open, current: '/', userName: '동욱',
    onClose: vi.fn(), onNavigate: vi.fn(), onLogout: vi.fn(),
  }
  render(<SideMenu {...props} />)
  return props
}

describe('SideMenu', () => {
  it('닫혀 있으면 아무것도 그리지 않는다', () => {
    setup(false)
    expect(screen.queryByRole('navigation', { name: '메뉴' })).toBeNull()
  })

  it('열리면 메뉴 4개와 사용자 이름, 현재 화면 표시', () => {
    setup()
    for (const label of ['Dashboard', 'Calendar', 'Archive', 'Time']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(screen.getByText(/동욱님/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dashboard/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: /Calendar/ })).not.toHaveAttribute('aria-current')
  })

  it('항목을 누르면 닫히고 그 화면으로 이동', () => {
    const p = setup()
    fireEvent.click(screen.getByRole('button', { name: /Calendar/ }))
    expect(p.onClose).toHaveBeenCalled()
    expect(p.onNavigate).toHaveBeenCalledWith('/calendar')
  })

  it('바깥(어두운 영역)을 누르면 닫힌다', () => {
    const p = setup()
    fireEvent.click(screen.getByTestId('side-menu-backdrop'))
    expect(p.onClose).toHaveBeenCalled()
    expect(p.onNavigate).not.toHaveBeenCalled()
  })

  it('Esc로 닫힌다', () => {
    const p = setup()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(p.onClose).toHaveBeenCalled()
  })

  it('로그아웃 버튼', () => {
    const p = setup()
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }))
    expect(p.onLogout).toHaveBeenCalled()
  })
})
