import { describe, expect, test } from "vitest"
import { drawRound, drawRounds, MIN_WINNER_GAP, winnerOf } from "./duel"
import { mulberry32 } from "./rng"
import { makeProduct, realCatalog } from "./testing"

const gapOf = (scores: number[]) => {
  const [first, second] = [...scores].sort((a, b) => b - a)
  return Math.round((first - second) * 1000) / 1000
}

describe("winnerOf", () => {
  test("победитель — товар с наибольшим скором, если он опережает второго на 0.03 и больше", () => {
    const products = [makeProduct({ id: 1, score: 0.3 }), makeProduct({ id: 2, score: 0.55 }), makeProduct({ id: 3, score: 0.4 })]
    expect(winnerOf(products)?.id).toBe(2)
  })

  test("разрыв ровно 0.03 достаточен (0.141 - 0.111 во float меньше 0.03)", () => {
    const products = [makeProduct({ id: 1, score: 0.141 }), makeProduct({ id: 2, score: 0.111 }), makeProduct({ id: 3, score: 0.05 })]
    expect(winnerOf(products)?.id).toBe(1)
  })

  test("разрыв меньше 0.03 — победителя нет", () => {
    const products = [makeProduct({ id: 1, score: 0.52 }), makeProduct({ id: 2, score: 0.5 }), makeProduct({ id: 3, score: 0.1 })]
    expect(winnerOf(products)).toBeNull()
  })

  test("ничья за первое место — победителя нет", () => {
    const products = [makeProduct({ id: 1, score: 0.5 }), makeProduct({ id: 2, score: 0.5 }), makeProduct({ id: 3, score: 0.1 })]
    expect(winnerOf(products)).toBeNull()
  })

  test("минимальный разрыв — 0.03", () => {
    expect(MIN_WINNER_GAP).toBe(0.03)
  })
})

describe("drawRound", () => {
  const catalog = realCatalog()

  test("три разных товара из каталога, победитель один", () => {
    const round = drawRound(catalog, mulberry32(1))
    expect(round.products).toHaveLength(3)
    expect(new Set(round.products.map((p) => p.id)).size).toBe(3)
    round.products.forEach((p) => expect(catalog.map((c) => c.id)).toContain(p.id))
    expect(round.winnerId).toBe(winnerOf(round.products)?.id)
    expect(gapOf(round.products.map((p) => p.score))).toBeGreaterThanOrEqual(MIN_WINNER_GAP)
  })

  test("товары раунда из разных категорий — не три творога", () => {
    for (let seed = 0; seed < 200; seed++) {
      const categories = drawRound(catalog, mulberry32(seed)).products.map((p) => p.category)
      expect(new Set(categories).size).toBe(3)
    }
  })

  test("товары без категории считаются разными", () => {
    const loose = [1, 2, 3, 4].map((id) => makeProduct({ id, score: id * 0.2, category: null }))
    expect(() => drawRound(loose, mulberry32(1))).not.toThrow()
  })

  test("не берёт исключённые товары", () => {
    const excluded = new Set(catalog.slice(0, 30).map((p) => p.id))
    for (let seed = 0; seed < 50; seed++) {
      drawRound(catalog, mulberry32(seed), excluded).products.forEach((p) => expect(excluded.has(p.id)).toBe(false))
    }
  })

  test("победитель стоит на любом месте: порядок не выдаёт ответ", () => {
    const places = [0, 0, 0]
    for (let seed = 0; seed < 600; seed++) {
      const round = drawRound(catalog, mulberry32(seed))
      places[round.products.findIndex((p) => p.id === round.winnerId)]++
    }
    places.forEach((count) => {
      expect(count).toBeGreaterThan(600 * 0.2)
      expect(count).toBeLessThan(600 * 0.47)
    })
  })

  test("разные seed дают разные раунды", () => {
    const keys = new Set<string>()
    for (let seed = 0; seed < 30; seed++) keys.add(drawRound(catalog, mulberry32(seed)).products.map((p) => p.id).sort().join())
    expect(keys.size).toBeGreaterThan(20)
  })

  test("если честного раунда собрать нельзя — понятная ошибка", () => {
    const flat = [0.5, 0.5, 0.1, 0.51].map((score, i) => makeProduct({ id: i + 1, score }))
    expect(() => drawRound(flat, mulberry32(1))).toThrow(/победител/)
  })

  test("если товаров меньше трёх — понятная ошибка", () => {
    expect(() => drawRound([makeProduct({ id: 1 })], mulberry32(1))).toThrow(/3/)
  })
})

describe("drawRounds", () => {
  const catalog = realCatalog()

  test("10 раундов, товары не повторяются между раундами", () => {
    const rounds = drawRounds(catalog, mulberry32(5), 10)
    expect(rounds).toHaveLength(10)
    const ids = rounds.flatMap((r) => r.products.map((p) => p.id))
    expect(new Set(ids).size).toBe(30)
    rounds.forEach((r) => expect(r.winnerId).toBe(winnerOf(r.products)?.id))
  })

  test("собирается на настоящем каталоге при любом seed", () => {
    for (let seed = 1; seed <= 100; seed++) expect(() => drawRounds(catalog, mulberry32(seed), 10)).not.toThrow()
  })

  test("если каталог слишком мал — ошибка с нужным числом товаров", () => {
    const tiny = catalog.slice(0, 20)
    expect(() => drawRounds(tiny, mulberry32(1), 10)).toThrow(/30/)
  })
})
