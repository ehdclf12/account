import type { ReactNode } from 'react'

/** 가운데 뜨는 시트. 바깥을 누르면 닫힌다(기존 TimeGoalSheet와 같은 모양). */
export default function Sheet(
  { title, onClose, children }: { title: string; onClose: () => void; children: ReactNode },
) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dim" onClick={onClose}>
      <div role="dialog" aria-label={title}
        className="w-full max-w-md max-h-[85vh] overflow-y-auto bg-surface rounded-2xl p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <span className="font-bold text-ink">{title}</span>
          <button onClick={onClose} className="text-sub text-sm font-medium min-h-[44px] px-2">닫기</button>
        </div>
        {children}
      </div>
    </div>
  )
}
