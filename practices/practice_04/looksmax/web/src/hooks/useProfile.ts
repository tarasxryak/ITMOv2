import { useEffect, useSyncExternalStore } from "react"
import { cpsOf } from "@/lib/clicker"
import { createPersistor } from "@/lib/persist"
import { tick, type Profile } from "@/lib/profile"
import { loadProfile, type StorageLike } from "@/lib/storage"
import { themeById } from "@/lib/themes"

// Один профиль на всё приложение: кошелёк криптошекелей общий для дуэли, кликера и магазина тем.
function browserStorage(): StorageLike | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

const storage = browserStorage()
const nothing: StorageLike = { getItem: () => null, setItem: () => {} }
let state: Profile = loadProfile(storage ?? nothing)
const listeners = new Set<() => void>()
const persistor = createPersistor(storage)

document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && persistor.flush())
window.addEventListener("pagehide", persistor.flush)

export type ActionResult = { ok: true } | { ok: false; error: string }

export function updateProfile(change: (profile: Profile) => Profile): ActionResult {
  try {
    state = change(state)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Не получилось" }
  }
  listeners.forEach((listener) => listener())
  persistor.markDirty(state)
  return { ok: true }
}

export const getProfile = () => state

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// select должен возвращать примитив или уже существующий объект профиля, иначе компонент зациклится.
export function useProfile<T>(select: (profile: Profile) => T): T {
  return useSyncExternalStore(subscribe, () => select(state))
}

// Автокликеры работают, пока открыта страница; пересчёт четыре раза в секунду.
export function useIncomeLoop() {
  useEffect(() => {
    let last = performance.now()
    const id = setInterval(() => {
      const now = performance.now()
      const seconds = (now - last) / 1000
      last = now
      if (cpsOf(getProfile().owned) > 0) updateProfile((p) => tick(p, seconds))
    }, 250)
    return () => clearInterval(id)
  }, [])
}

// Тема лежит в профиле; на странице её выражают атрибут data-theme и класс dark.
export function useApplyTheme() {
  const theme = useProfile((p) => p.theme)
  useEffect(() => {
    const root = document.documentElement
    if (theme === "light" || theme === "dark") root.removeAttribute("data-theme")
    else root.setAttribute("data-theme", theme)
    root.classList.toggle("dark", themeById(theme).dark)
  }, [theme])
}
