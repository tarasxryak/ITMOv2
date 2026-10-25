// Игра «Корзина на бюджет»: из 12 товаров собрать корзину с максимумом белка.
// Правила не дают взять 10 куриных грудок: каждый товар один раз, не больше 2 из одной категории,
// калорий не больше лимита. Лучшую корзину находит полный перебор: подмножеств всего 2^12.
import { rankFor, type RankName } from "./game"
import { categoryKey } from "./product"
import { sample, type Rng } from "./rng"
import type { Portion, Product } from "./types"

export const POOL_SIZE = 12
export const MAX_PER_CATEGORY = 2
export const KCAL_CAP = 2000
// В наборе из 12 товаров одна категория встречается не больше 3 раз: иначе выбор слишком однообразный.
const MAX_POOL_PER_CATEGORY = 3
const MIN_BEST_ITEMS = 3
const MAX_BEST_ITEMS = 7
const BUDGET_SHARE = { min: 0.3, spread: 0.2 }
const MAX_ATTEMPTS = 300
const MAX_EXHAUSTIVE = 20
const EPSILON = 1e-9

export type Challenge = { products: Product[]; budget: number; kcalCap: number }
export type Totals = { price: number; kcal: number; protein: number; fat: number; carbs: number; grams: number }
export type Best = { items: Product[]; totals: Totals }
export type AddCheck = { ok: true } | { ok: false; reason: string }

export type BasketResult = {
  totals: Totals
  best: Best
  efficiency: number
  rank: RankName
  isBest: boolean
  missed: Product[]
  extra: Product[]
}

function portionOf(product: Product): Portion {
  if (!product.portion) throw new Error(`у товара «${product.name}» нет порции: его нельзя положить в корзину`)
  return product.portion
}

export function basketTotals(items: readonly Product[]): Totals {
  const totals: Totals = { price: 0, kcal: 0, protein: 0, fat: 0, carbs: 0, grams: 0 }
  for (const item of items) {
    const portion = portionOf(item)
    const factor = portion.grams / 100
    totals.price += portion.price
    totals.grams += portion.grams
    totals.kcal += item.kbju.kcal * factor
    totals.protein += item.kbju.protein * factor
    totals.fat += item.kbju.fat * factor
    totals.carbs += item.kbju.carbs * factor
  }
  return totals
}

function countByCategory(items: readonly Product[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const item of items) counts.set(categoryKey(item), (counts.get(categoryKey(item)) ?? 0) + 1)
  return counts
}

export function checkAdd(challenge: Challenge, selected: readonly Product[], candidate: Product): AddCheck {
  if (!challenge.products.some((p) => p.id === candidate.id)) {
    return { ok: false, reason: `«${candidate.name}»: этого товара нет в этом наборе` }
  }
  if (selected.some((p) => p.id === candidate.id)) {
    return { ok: false, reason: `«${candidate.name}» уже в корзине: каждый товар можно взять один раз` }
  }
  if ((countByCategory(selected).get(categoryKey(candidate)) ?? 0) >= MAX_PER_CATEGORY) {
    return {
      ok: false,
      reason: `уже ${MAX_PER_CATEGORY} товара из категории «${candidate.category}»: больше нельзя`,
    }
  }
  const after = basketTotals([...selected, candidate])
  if (after.price > challenge.budget) {
    return { ok: false, reason: `не влезает в бюджет: не хватает ${after.price - challenge.budget} ₽` }
  }
  if (after.kcal > challenge.kcalCap + EPSILON) {
    return {
      ok: false,
      reason: `больше лимита калорий: было бы ${Math.round(after.kcal)} из ${challenge.kcalCap} ккал`,
    }
  }
  return { ok: true }
}

// Всё, что нарушает правила в готовой корзине. Пусто — корзину можно сдавать.
export function violations(challenge: Challenge, selected: readonly Product[]): string[] {
  const problems: string[] = []
  const seen = new Set<number>()
  for (const item of selected) {
    if (!challenge.products.some((p) => p.id === item.id)) problems.push(`«${item.name}»: этого товара нет в этом наборе`)
    if (seen.has(item.id)) problems.push(`«${item.name}» лежит в корзине дважды`)
    seen.add(item.id)
  }
  for (const [category, count] of countByCategory(selected)) {
    if (count > MAX_PER_CATEGORY) problems.push(`больше ${MAX_PER_CATEGORY} товаров из категории «${category}»`)
  }
  const totals = basketTotals(selected)
  if (totals.price > challenge.budget) problems.push(`не влезает в бюджет: перебор на ${totals.price - challenge.budget} ₽`)
  if (totals.kcal > challenge.kcalCap + EPSILON) {
    problems.push(`больше лимита калорий: ${Math.round(totals.kcal)} из ${challenge.kcalCap} ккал`)
  }
  return problems
}

// Лучшая корзина: максимум белка; при равном белке меньше калорий, потом дешевле.
export function bestBasket(challenge: Challenge): Best {
  const { products, budget, kcalCap } = challenge
  const n = products.length
  if (n > MAX_EXHAUSTIVE) throw new Error(`в наборе ${n} товаров: полный перебор рассчитан на ${MAX_EXHAUSTIVE}`)
  const portions = products.map(portionOf)
  const kcal = products.map((p, i) => (p.kbju.kcal * portions[i].grams) / 100)
  const protein = products.map((p, i) => (p.kbju.protein * portions[i].grams) / 100)
  const categories = products.map(categoryKey)

  let bestMask = 0
  let best = { protein: 0, kcal: 0, price: 0 }
  for (let mask = 1; mask < 1 << n; mask++) {
    let price = 0
    let kcalSum = 0
    let proteinSum = 0
    let valid = true
    const counts = new Map<string, number>()
    for (let i = 0; i < n && valid; i++) {
      if (!(mask & (1 << i))) continue
      price += portions[i].price
      kcalSum += kcal[i]
      proteinSum += protein[i]
      const count = (counts.get(categories[i]) ?? 0) + 1
      counts.set(categories[i], count)
      valid = price <= budget && kcalSum <= kcalCap + EPSILON && count <= MAX_PER_CATEGORY
    }
    if (!valid) continue
    const better =
      bestMask === 0 ||
      proteinSum > best.protein + EPSILON ||
      (Math.abs(proteinSum - best.protein) <= EPSILON &&
        (kcalSum < best.kcal - EPSILON || (Math.abs(kcalSum - best.kcal) <= EPSILON && price < best.price)))
    if (better) {
      bestMask = mask
      best = { protein: proteinSum, kcal: kcalSum, price }
    }
  }
  const items = products.filter((_, i) => bestMask & (1 << i))
  return { items, totals: basketTotals(items) }
}

export function scoreBasket(challenge: Challenge, selected: readonly Product[]): BasketResult {
  const problems = violations(challenge, selected)
  if (problems.length) throw new Error(problems[0])
  const best = bestBasket(challenge)
  const totals = basketTotals(selected)
  const ratio = best.totals.protein > 0 ? totals.protein / best.totals.protein : 0
  // Округляем вниз: 99,96% — это ещё не 100%, true adam только у лучшей корзины.
  const efficiency = ratio >= 1 - EPSILON ? 100 : Math.floor(ratio * 1000 + EPSILON) / 10
  const chosen = new Set(selected.map((p) => p.id))
  const optimal = new Set(best.items.map((p) => p.id))
  return {
    totals,
    best,
    efficiency,
    rank: rankFor(efficiency),
    isBest: efficiency === 100,
    missed: best.items.filter((p) => !chosen.has(p.id)),
    extra: selected.filter((p) => !optimal.has(p.id)),
  }
}

// Набор из 12 случайных товаров со случайным бюджетом. Берём только такие, где лучшая корзина
// небанальна: от 3 до 7 товаров.
export function drawChallenge(catalog: readonly Product[], rng: Rng): Challenge {
  const eligible = catalog.filter((p) => p.portion !== null)
  if (eligible.length < POOL_SIZE) {
    throw new Error(`в каталоге мало товаров с известной массой: нужно минимум ${POOL_SIZE}, есть ${eligible.length}`)
  }
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const products = sample(eligible, POOL_SIZE, rng)
    if (Math.max(...countByCategory(products).values()) > MAX_POOL_PER_CATEGORY) continue
    const total = products.reduce((sum, p) => sum + portionOf(p).price, 0)
    const budget = Math.max(10, Math.round((total * (BUDGET_SHARE.min + rng() * BUDGET_SHARE.spread)) / 10) * 10)
    const challenge = { products, budget, kcalCap: KCAL_CAP }
    const { items } = bestBasket(challenge)
    if (items.length >= MIN_BEST_ITEMS && items.length <= MAX_BEST_ITEMS) return challenge
  }
  throw new Error("не получилось собрать интересный набор из этого каталога: добавь товаров")
}
