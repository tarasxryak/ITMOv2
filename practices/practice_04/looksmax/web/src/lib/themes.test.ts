import { describe, expect, test } from "vitest"
import { DEFAULT_THEME, isThemeId, themeById, THEMES } from "./themes"

describe("темы", () => {
  test("две бесплатные и две платные: сакура и cyberpunk", () => {
    expect(THEMES.map((t) => t.id)).toEqual(["light", "dark", "sakura", "cyberpunk"])
    expect(THEMES.filter((t) => t.price === 0).map((t) => t.id)).toEqual(["light", "dark"])
    expect(themeById("sakura").price).toBeGreaterThan(0)
    expect(themeById("cyberpunk").price).toBeGreaterThan(themeById("sakura").price)
  })

  test("тема по умолчанию бесплатная и светлая", () => {
    expect(DEFAULT_THEME).toBe("light")
    expect(themeById(DEFAULT_THEME)).toMatchObject({ price: 0, dark: false })
  })

  test("cyberpunk тёмная, сакура светлая: от этого зависит класс dark на странице", () => {
    expect(themeById("cyberpunk").dark).toBe(true)
    expect(themeById("sakura").dark).toBe(false)
    expect(themeById("dark").dark).toBe(true)
  })

  test("у каждой темы есть название, описание и четыре цвета для превью", () => {
    for (const theme of THEMES) {
      expect(theme.name.length).toBeGreaterThan(2)
      expect(theme.description.length).toBeGreaterThan(5)
      expect(theme.swatch).toHaveLength(4)
      theme.swatch.forEach((color) => expect(color).toMatch(/^#[0-9a-f]{6}$/i))
    }
  })

  test("themeById на неизвестный id отвечает ошибкой со списком тем", () => {
    expect(() => themeById("matrix" as never)).toThrow(/matrix.*light/)
  })

  test("isThemeId отличает известные id от мусора", () => {
    expect(isThemeId("sakura")).toBe(true)
    expect(isThemeId("matrix")).toBe(false)
    expect(isThemeId(42)).toBe(false)
    expect(isThemeId(null)).toBe(false)
  })
})
