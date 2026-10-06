import { useCallback, useState } from "react"

const KEY = "looksmax-theme"

// Начальную тему ставит скрипт в index.html до отрисовки; здесь она только читается и переключается.
export function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"))

  const toggle = useCallback(() => {
    const next = !dark
    document.documentElement.classList.toggle("dark", next)
    try {
      localStorage.setItem(KEY, next ? "dark" : "light")
    } catch {
      // Приватный режим без localStorage: тема просто не запомнится.
    }
    setDark(next)
  }, [dark])

  return { dark, toggle }
}
