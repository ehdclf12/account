import { useState } from 'react'
import { applyTheme, loadTheme, saveTheme } from '@/lib/theme'
import type { Theme } from '@/lib/theme'

const OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: '☀︎ 라이트' },
  { value: 'dark', label: '☾ 다크' },
]

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(loadTheme)

  function pick(t: Theme) {
    setTheme(t)
    saveTheme(t)
    applyTheme(t)
  }

  return (
    <div className="flex gap-1 bg-card rounded-full p-1">
      {OPTIONS.map((o) => (
        <button key={o.value} onClick={() => pick(o.value)}
          className={`rounded-full px-3 py-1 text-xs font-medium active:opacity-70
            ${theme === o.value ? 'bg-surface text-ink' : 'text-sub'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
