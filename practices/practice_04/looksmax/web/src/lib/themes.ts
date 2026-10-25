// Темы сайта. Две бесплатные, остальные покупаются за криптошекели в кликере.
export type ThemeId = "light" | "dark" | "sakura" | "cyberpunk"

export type Theme = {
  id: ThemeId
  name: string
  description: string
  /** Цена в криптошекелях; 0 — тема открыта сразу. */
  price: number
  /** Тёмная ли тема: от этого зависит класс dark на странице (он включает dark: варианты Tailwind). */
  dark: boolean
  /** Фон, текст, акцент и поверхность: четыре цвета для превью в магазине. */
  swatch: [string, string, string, string]
}

export const THEMES: readonly Theme[] = [
  {
    id: "light",
    name: "Холодильный ряд",
    description: "Светлая тема по умолчанию: ледяной фон и жёлтые ценники.",
    price: 0,
    dark: false,
    swatch: ["#e9f0f1", "#0d3b2e", "#ffd23f", "#ffffff"],
  },
  {
    id: "dark",
    name: "Ночной магазин",
    description: "Та же тема в тёмных тонах, когда в магазине выключили свет.",
    price: 0,
    dark: true,
    swatch: ["#0a1e19", "#e6f2ee", "#ffd23f", "#11302a"],
  },
  {
    id: "sakura",
    name: "Сакура",
    description: "Нежно-розовая тема, по сайту падают лепестки.",
    price: 300,
    dark: false,
    swatch: ["#fff1f5", "#4a1f33", "#ffb3cc", "#ffffff"],
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    description: "Неон, жёлтый и циан: Найт-Сити после полуночи.",
    price: 1500,
    dark: true,
    swatch: ["#0b0a12", "#f2f0fa", "#fcee0a", "#00f0ff"],
  },
]

export const DEFAULT_THEME: ThemeId = "light"

export const isThemeId = (value: unknown): value is ThemeId => typeof value === "string" && THEMES.some((t) => t.id === value)

export function themeById(id: ThemeId): Theme {
  const theme = THEMES.find((t) => t.id === id)
  if (!theme) throw new Error(`темы «${id}» нет, есть: ${THEMES.map((t) => t.id).join(", ")}`)
  return theme
}
