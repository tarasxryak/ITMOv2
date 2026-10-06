import { describe, expect, test } from "vitest"
import {
  basketTotals,
  bestBasket,
  checkAdd,
  drawChallenge,
  KCAL_CAP,
  MAX_PER_CATEGORY,
  POOL_SIZE,
  scoreBasket,
  violations,
  type Challenge,
} from "./basket"
import { mulberry32, shuffle } from "./rng"
import { makeProduct, realCatalog } from "./testing"
import type { Product } from "./types"

// Товар с известной порцией: белок и ккал считаются на порцию (grams / 100 от значений на 100 г).
function item(id: number, o: { price: number; protein: number; kcal: number; category: string; grams?: number }): Product {
  const grams = o.grams ?? 100
  return makeProduct({
    id,
    category: o.category,
    kbju: { protein: o.protein, fat: 0, carbs: 0, kcal: o.kcal },
    portion: { grams, price: o.price },
  })
}

const challenge = (products: Product[], budget: number, kcalCap = 99999): Challenge => ({ products, budget, kcalCap })
const ids = (products: Product[]) => products.map((p) => p.id).sort((a, b) => a - b)

describe("basketTotals", () => {
  test("суммирует цену, калории, КБЖУ и массу по порциям", () => {
    const a = item(1, { price: 100, protein: 20, kcal: 120, category: "A", grams: 500 })
    const b = item(2, { price: 50, protein: 10, kcal: 200, category: "B", grams: 200 })
    expect(basketTotals([a, b])).toEqual({ price: 150, kcal: 1000, protein: 120, fat: 0, carbs: 0, grams: 700 })
  })

  test("пустая корзина — нули", () => {
    expect(basketTotals([])).toEqual({ price: 0, kcal: 0, protein: 0, fat: 0, carbs: 0, grams: 0 })
  })

  test("товар без порции в корзину не попадает", () => {
    expect(() => basketTotals([makeProduct({ id: 1, portion: null })])).toThrow(/порци/)
  })
})

describe("правила корзины", () => {
  const a = item(1, { price: 60, protein: 30, kcal: 200, category: "Курица" })
  const b = item(2, { price: 50, protein: 25, kcal: 150, category: "Курица" })
  const c = item(3, { price: 40, protein: 20, kcal: 100, category: "Курица" })
  const d = item(4, { price: 30, protein: 5, kcal: 900, category: "Шоколад" })
  const stranger = item(99, { price: 10, protein: 1, kcal: 10, category: "Другое" })
  const ch = challenge([a, b, c, d], 150, 1000)

  test("товар, который влезает, можно добавить", () => {
    expect(checkAdd(ch, [a], b)).toEqual({ ok: true })
  })

  test("не больше 2 товаров из одной категории — нельзя взять 10 куриных грудок", () => {
    expect(MAX_PER_CATEGORY).toBe(2)
    const result = checkAdd(ch, [a, b], c)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.reason).toMatch(/категори.*Курица/)
  })

  test("один и тот же товар дважды — нельзя", () => {
    const result = checkAdd(ch, [a], a)
    expect(!result.ok && result.reason).toMatch(/уже в корзине/)
  })

  test("не влезает в бюджет — причина с суммой, которой не хватает", () => {
    // 60 + 40 уже стоят 100 ₽ из 100; шоколад за 30 ₽ не помещается, не хватает 30 ₽.
    const result = checkAdd(challenge([a, b, c, d], 100), [a, c], d)
    expect(!result.ok && result.reason).toMatch(/бюджет.*30/)
  })

  test("больше лимита калорий — нельзя", () => {
    const tight = challenge([a, d], 1000, 1000)
    const result = checkAdd(tight, [a], d)
    expect(!result.ok && result.reason).toMatch(/калор/)
  })

  test("товара нет в этом наборе — нельзя", () => {
    const result = checkAdd(ch, [], stranger)
    expect(!result.ok && result.reason).toMatch(/нет в этом наборе/)
  })

  test("violations: допустимая корзина чиста, недопустимая перечисляет нарушения", () => {
    expect(violations(ch, [a, b])).toEqual([])
    const bad = violations(ch, [a, b, c, d])
    expect(bad.some((m) => /бюджет/.test(m))).toBe(true)
    expect(bad.some((m) => /категори/.test(m))).toBe(true)
  })
})

describe("bestBasket", () => {
  test("находит корзину с максимумом белка в рамках бюджета", () => {
    const pool = [
      item(1, { price: 60, protein: 30, kcal: 200, category: "X" }),
      item(2, { price: 50, protein: 25, kcal: 150, category: "Y" }),
      item(3, { price: 50, protein: 25, kcal: 150, category: "Z" }),
      item(4, { price: 100, protein: 40, kcal: 300, category: "W" }),
    ]
    const best = bestBasket(challenge(pool, 100))
    expect(ids(best.items)).toEqual([2, 3])
    expect(best.totals.protein).toBe(50)
  })

  test("учитывает лимит калорий", () => {
    const pool = [
      item(1, { price: 50, protein: 40, kcal: 500, category: "X" }),
      item(2, { price: 50, protein: 20, kcal: 100, category: "Y" }),
      item(3, { price: 50, protein: 18, kcal: 100, category: "Z" }),
    ]
    expect(ids(bestBasket(challenge(pool, 100, 300)).items)).toEqual([2, 3])
  })

  test("учитывает лимит на категорию: из трёх лучших куриных берёт два", () => {
    const pool = [
      item(1, { price: 10, protein: 30, kcal: 100, category: "Курица" }),
      item(2, { price: 10, protein: 30, kcal: 100, category: "Курица" }),
      item(3, { price: 10, protein: 30, kcal: 100, category: "Курица" }),
      item(4, { price: 10, protein: 5, kcal: 100, category: "Сыр" }),
    ]
    const best = bestBasket(challenge(pool, 1000))
    expect(best.items).toHaveLength(3)
    expect(best.items.filter((p) => p.category === "Курица")).toHaveLength(2)
    expect(best.totals.protein).toBe(65)
  })

  test("при равном белке выбирает корзину с меньшим числом калорий", () => {
    const pool = [
      item(1, { price: 50, protein: 30, kcal: 400, category: "X" }),
      item(2, { price: 50, protein: 30, kcal: 200, category: "Y" }),
    ]
    expect(ids(bestBasket(challenge(pool, 50)).items)).toEqual([2])
  })

  test("если ничего не влезает — корзина пуста", () => {
    const pool = [item(1, { price: 500, protein: 30, kcal: 400, category: "X" })]
    expect(bestBasket(challenge(pool, 100)).items).toEqual([])
  })

  test("слишком большой набор не перебираем", () => {
    const pool = Array.from({ length: 21 }, (_, i) => item(i + 1, { price: 1, protein: 1, kcal: 1, category: `C${i}` }))
    expect(() => bestBasket(challenge(pool, 10))).toThrow(/21/)
  })
})

describe("scoreBasket", () => {
  const pool = [
    item(1, { price: 60, protein: 30, kcal: 200, category: "X" }),
    item(2, { price: 50, protein: 25, kcal: 150, category: "Y" }),
    item(3, { price: 50, protein: 25, kcal: 150, category: "Z" }),
    item(4, { price: 100, protein: 40, kcal: 300, category: "W" }),
  ]
  const ch = challenge(pool, 100)

  test("лучшая корзина — 100% и true adam", () => {
    const result = scoreBasket(ch, [pool[1], pool[2]])
    expect(result).toMatchObject({ efficiency: 100, rank: "true adam", isBest: true })
    expect(result.missed).toEqual([])
    expect(result.extra).toEqual([])
  })

  test("эффективность — доля белка лучшей корзины, ранг по той же лестнице", () => {
    const result = scoreBasket(ch, [pool[0]]) // 30 г из 50 г
    expect(result.efficiency).toBe(60)
    expect(result.rank).toBe("HTN")
    expect(result.isBest).toBe(false)
    expect(ids(result.missed)).toEqual([2, 3])
    expect(ids(result.extra)).toEqual([1])
  })

  test("почти лучшая корзина не получает 100%", () => {
    const almost = [
      item(1, { price: 10, protein: 99.99, kcal: 100, category: "X" }),
      item(2, { price: 10, protein: 100, kcal: 100, category: "Y" }),
    ]
    const result = scoreBasket(challenge(almost, 10), [almost[0]])
    expect(result.efficiency).toBeLessThan(100)
    expect(result.rank).toBe("chad")
  })

  test("пустая корзина — 0% и sub3", () => {
    expect(scoreBasket(ch, [])).toMatchObject({ efficiency: 0, rank: "sub3" })
  })

  test("недопустимую корзину не оцениваем: сначала нарушение", () => {
    expect(() => scoreBasket(ch, [pool[0], pool[3]])).toThrow(/бюджет/)
  })
})

describe("drawChallenge", () => {
  const catalog = realCatalog()

  test("12 товаров с порцией, бюджет кратен 10, не больше 3 из одной категории", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const ch = drawChallenge(catalog, mulberry32(seed))
      expect(ch.products).toHaveLength(POOL_SIZE)
      expect(new Set(ch.products.map((p) => p.id)).size).toBe(POOL_SIZE)
      ch.products.forEach((p) => expect(p.portion).not.toBeNull())
      expect(ch.budget % 10).toBe(0)
      expect(ch.kcalCap).toBe(KCAL_CAP)
      const perCategory = new Map<string, number>()
      ch.products.forEach((p) => perCategory.set(p.category ?? `#${p.id}`, (perCategory.get(p.category ?? `#${p.id}`) ?? 0) + 1))
      expect(Math.max(...perCategory.values())).toBeLessThanOrEqual(3)
    }
  })

  test("задача небанальна: в лучшей корзине от 3 до 7 товаров", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const best = bestBasket(drawChallenge(catalog, mulberry32(seed)))
      expect(best.items.length).toBeGreaterThanOrEqual(3)
      expect(best.items.length).toBeLessThanOrEqual(7)
      expect(best.totals.protein).toBeGreaterThan(0)
    }
  })

  test("один seed — один набор, разные seed — разные", () => {
    const key = (seed: number) => drawChallenge(catalog, mulberry32(seed)).products.map((p) => p.id).join()
    expect(key(3)).toBe(key(3))
    expect(new Set([1, 2, 3, 4, 5, 6, 7, 8].map(key)).size).toBeGreaterThan(5)
  })

  test("товары без порции в набор не попадают", () => {
    for (let seed = 1; seed <= 30; seed++) {
      drawChallenge(catalog, mulberry32(seed)).products.forEach((p) => expect(p.portion).not.toBeNull())
    }
  })

  test("если товаров с известной массой мало — понятная ошибка", () => {
    const few = catalog.filter((p) => p.portion).slice(0, 5)
    expect(() => drawChallenge(few, mulberry32(1))).toThrow(/мало товаров с известной массой.*12/)
  })
})

describe("bestBasket оптимален (независимая проверка случайными корзинами)", () => {
  const catalog = realCatalog()

  test("ни одна случайная допустимая корзина не даёт больше белка", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const ch = drawChallenge(catalog, mulberry32(seed))
      const best = bestBasket(ch)
      expect(violations(ch, best.items)).toEqual([])
      const rng = mulberry32(seed * 1000)
      for (let i = 0; i < 300; i++) {
        const size = 1 + Math.floor(rng() * 8)
        const selected: Product[] = []
        for (const candidate of shuffle(ch.products, rng)) {
          if (selected.length === size) break
          if (checkAdd(ch, selected, candidate).ok) selected.push(candidate)
        }
        expect(basketTotals(selected).protein).toBeLessThanOrEqual(best.totals.protein + 1e-9)
      }
    }
  })
})
