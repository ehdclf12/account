import { useSyncExternalStore } from 'react'
import { getToasts, subscribeToasts, dismissToast } from '@/lib/toast'

export default function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts)
  if (toasts.length === 0) return null

  return (
    <div className="fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismissToast(t.id)}
          role="alert"
          className="pointer-events-auto w-full max-w-sm rounded-2xl bg-ink/95 text-bg
                     px-4 py-3 text-sm text-left shadow-lg"
        >
          {t.text}
        </button>
      ))}
    </div>
  )
}
