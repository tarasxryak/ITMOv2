// Состояние игры «Дуэль»: коины, серия, подсказка, ранг. Все функции чистые.
import type { Round } from "./duel"
import type { Product } from "./types"

export const COINS_CORRECT = 10
export const COINS_STREAK_BONUS = 5
export const STREAK_FROM = 3
export const HINT_COST = 15

// Лестница рангов снизу вверх: from — минимальный процент для ранга.
export const RANKS = [
  { name: "sub3", from: 0 },
  { name: "sub5", from: 20 },
  { name: "LTN", from: 40 },
  { name: "MTN", from: 50 },
  { name: "HTN", from: 60 },
  { name: "chadlite", from: 70 },
  { name: "chad", from: 80 },
  { name: "true adam", from: 100 },
] as const

export type RankName = (typeof RANKS)[number]["name"]

export function rankFor(percent: number): RankName {
  let rank: RankName = RANKS[0].name
  for (const r of RANKS) {
    if (percent >= r.from) rank = r.name
  }
  return rank
}

// streak — длина серии верных ответов подряд, включая текущий.
export const coinsForCorrect = (streak: number) => COINS_CORRECT + (streak >= STREAK_FROM ? COINS_STREAK_BONUS : 0)

export type Pick = { productId: number; correct: boolean }

export type Game = {
  rounds: Round[]
  index: number
  coins: number
  streak: number
  correct: number
  picks: Pick[]
  // Какой товар убран подсказкой в раунде с таким индексом.
  removed: Record<number, number>
}

export function createGame(rounds: Round[]): Game {
  return { rounds, index: 0, coins: 0, streak: 0, correct: 0, picks: [], removed: {} }
}

export function currentPick(state: Game): Pick | null {
  return state.picks[state.index] ?? null
}

export function isFinished(state: Game): boolean {
  return state.index >= state.rounds.length
}

export function removedId(state: Game): number | null {
  return state.removed[state.index] ?? null
}

export function choose(state: Game, productId: number): Game {
  const round = state.rounds[state.index]
  if (currentPick(state)) throw new Error("в этом раунде товар уже выбран: нажми «Дальше»")
  if (!round.products.some((p) => p.id === productId)) throw new Error(`товара ${productId} нет в текущем раунде`)
  if (removedId(state) === productId) throw new Error("этот товар убран подсказкой, выбери из оставшихся")
  const correct = productId === round.winnerId
  const streak = correct ? state.streak + 1 : 0
  return {
    ...state,
    coins: state.coins + (correct ? coinsForCorrect(streak) : 0),
    streak,
    correct: state.correct + (correct ? 1 : 0),
    picks: [...state.picks, { productId, correct }],
  }
}

export function canUseHint(state: Game): boolean {
  return !isFinished(state) && !currentPick(state) && removedId(state) === null && state.coins >= HINT_COST
}

// Подсказка: за 15 коинов убирает один случайный неверный вариант раунда.
export function useHint(state: Game, random: () => number = Math.random): Game {
  if (removedId(state) !== null) throw new Error("подсказка в этом раунде уже использована")
  if (currentPick(state)) throw new Error("товар уже выбран: подсказка работает только до выбора")
  if (state.coins < HINT_COST) throw new Error(`для подсказки нужно ${HINT_COST} коинов, а у тебя ${state.coins}`)
  const round = state.rounds[state.index]
  const wrong = round.products.filter((p) => p.id !== round.winnerId)
  const removed = wrong[Math.floor(random() * wrong.length)]
  return { ...state, coins: state.coins - HINT_COST, removed: { ...state.removed, [state.index]: removed.id } }
}

export function nextRound(state: Game): Game {
  if (!currentPick(state)) throw new Error("сначала выбери товар в этом раунде")
  return { ...state, index: state.index + 1 }
}

export function summary(state: Game) {
  const total = state.rounds.length
  const percent = Math.round((state.correct / total) * 100)
  const picked: Product[] = state.picks.map((pick, i) => state.rounds[i].products.find((p) => p.id === pick.productId)!)
  return {
    correct: state.correct,
    total,
    percent,
    rank: rankFor(percent),
    coins: state.coins,
    picked,
    xmlIds: picked.map((p) => p.xml_id),
  }
}
