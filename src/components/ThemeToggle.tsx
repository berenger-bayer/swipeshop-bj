'use client'

import * as React from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="w-10 h-10" />
  }

  const themes = [
    { id: 'light', icon: <Sun size={18} />, label: 'Clair' },
    { id: 'dark', icon: <Moon size={18} />, label: 'Sombre' },
    { id: 'system', icon: <Monitor size={18} />, label: 'Système' },
  ]

  return (
    <div className="flex items-center p-1.5 glass-pro rounded-2xl border border-white/20 shadow-sm">
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          className={`
            p-2 rounded-xl transition-all duration-300 flex items-center justify-center
            ${theme === t.id 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40' 
              : 'text-slate-400 hover:text-indigo-500 hover:bg-white/50 dark:hover:bg-slate-800/50'}
          `}
          title={t.label}
        >
          {t.icon}
        </button>
      ))}
    </div>
  )
}
