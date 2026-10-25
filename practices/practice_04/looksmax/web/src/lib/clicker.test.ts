import { describe, expect, test } from "vitest"
import { CLICK_UPGRADE, clickPower, clickUpgradeCost, costOf, cpsOf, UPGRADES, upgradeById } from "./clicker"

describe("улучшения", () => {
  test("шесть автокликеров, дороже и сильнее с каждым шагом", () => {
    expect(UPGRADES).toHaveLength(6)
    expect(new Set(UPGRADES.map((u) => u.id)).size).toBe(6)
    for (let i = 1; i < UPGRADES.length; i++) {
      expect(UPGRADES[i].baseCost).toBeGreaterThan(UPGRADES[i - 1].baseCost)
      expect(UPGRADES[i].cps).toBeGreaterThan(UPGRADES[i - 1].cps)
    }
  })

  test("первый автокликер доступен почти сразу: стоит 15, даёт 0,1 в секунду", () => {
    expect(UPGRADES[0]).toMatchObject({ id: "autoclick", baseCost: 15, cps: 0.1 })
  })

  test("у каждого есть название и описание по-русски", () => {
    for (const upgrade of UPGRADES) {
      expect(upgrade.name.length).toBeGreaterThan(3)
      expect(upgrade.description.length).toBeGreaterThan(10)
    }
  })

  test("upgradeById на неизвестный id отвечает ошибкой", () => {
    expect(() => upgradeById("bitcoin" as never)).toThrow(/bitcoin/)
  })
})

describe("стоимость", () => {
  test("первая копия стоит базовую цену", () => {
    expect(costOf(UPGRADES[0], 0)).toBe(15)
  })

  test("каждая следующая дороже на 15 %, с округлением вверх", () => {
    // 15 × 1.15 = 17.25 → 18; 15 × 1.15² = 19.84 → 20
    expect(costOf(UPGRADES[0], 1)).toBe(18)
    expect(costOf(UPGRADES[0], 2)).toBe(20)
  })

  test("цена растёт монотонно", () => {
    let previous = 0
    for (let owned = 0; owned < 60; owned++) {
      const cost = costOf(UPGRADES[2], owned)
      expect(cost).toBeGreaterThan(previous)
      previous = cost
    }
  })

  test("отрицательное число копий — ошибка", () => {
    expect(() => costOf(UPGRADES[0], -1)).toThrow(/копий/)
  })
})

describe("клик", () => {
  test("без улучшений клик даёт 1, каждый уровень добавляет 1", () => {
    expect(clickPower(0)).toBe(1)
    expect(clickPower(3)).toBe(4)
  })

  test("улучшение клика дорожает на 60 %", () => {
    expect(clickUpgradeCost(0)).toBe(CLICK_UPGRADE.baseCost)
    expect(clickUpgradeCost(1)).toBe(Math.ceil(CLICK_UPGRADE.baseCost * 1.6))
  })
})

describe("доход в секунду", () => {
  test("ничего не куплено — ноль", () => {
    expect(cpsOf({})).toBe(0)
  })

  test("сумма по всем автокликерам: число копий × доход одной", () => {
    expect(cpsOf({ autoclick: 3, shaker: 2 })).toBeCloseTo(3 * 0.1 + 2 * 1, 10)
  })

  test("с каждым новым автокликером доход растёт", () => {
    const cps = UPGRADES.map((u, i) => cpsOf({ [u.id]: 1 }) + i * 0)
    expect(cps).toEqual([...cps].sort((a, b) => a - b))
  })
})
