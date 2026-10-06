import { categoryKey } from "./product"
import { sample, type Rng } from "./rng"
import type { Product } from "./types"

export const MIN_WINNER_GAP = 0.03
const MAX_ATTEMPTS = 500

export type Round = { products: Product[]; winnerId: number }

// Победитель один: его скор выше второго места минимум на MIN_WINNER_GAP.
// Скоры округлены до 3 знаков; без round 0.141 - 0.111 во float меньше 0.03.
export function winnerOf(products: readonly Product[]): Product | null {
  const [first, second] = [...products].sort((a, b) => b.score - a.score)
  return Math.round((first.score - second.score) * 1000) / 1000 >= MIN_WINNER_GAP ? first : null
}

// Случайные три товара из всего каталога: из разных категорий, победитель один.
export function drawRound(catalog: readonly Product[], rng: Rng, exclude: ReadonlySet<number> = new Set()): Round {
  const available = catalog.filter((p) => !exclude.has(p.id))
  if (available.length < 3) {
    throw new Error(`для раунда нужно минимум 3 товара, в каталоге осталось ${available.length}`)
  }
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const products = sample(available, 3, rng)
    if (new Set(products.map(categoryKey)).size < 3) continue
    const winner = winnerOf(products)
    if (winner) return { products, winnerId: winner.id }
  }
  throw new Error(
    `не нашлось трёх товаров из разных категорий с одним победителем (скор лучшего выше второго на ${MIN_WINNER_GAP} и больше): добавь товаров в каталог`,
  )
}

export function drawRounds(catalog: readonly Product[], rng: Rng, count: number): Round[] {
  const needed = count * 3
  if (catalog.length < needed) {
    throw new Error(`в каталоге мало товаров: для ${count} раундов нужно минимум ${needed}, есть ${catalog.length}`)
  }
  const used = new Set<number>()
  const rounds: Round[] = []
  for (let i = 0; i < count; i++) {
    const round = drawRound(catalog, rng, used)
    round.products.forEach((p) => used.add(p.id))
    rounds.push(round)
  }
  return rounds
}
