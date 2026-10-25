import { describe, expect, test } from "vitest"
import type { Round } from "./duel"
import {
  canUseHint,
  choose,
  createGame,
  currentPick,
  HINT_COST,
  isFinished,
  nextRound,
  rankFor,
  RANKS,
  removedId,
  summary,
  useHint,
} from "./game"
import { makeProduct } from "./testing"

// Раунд i: товары i*10+1 (победитель), i*10+2, i*10+3.
const ROUNDS: Round[] = Array.from({ length: 10 }, (_, i) => ({
  products: [1, 2, 3].map((n) => makeProduct({ id: i * 10 + n, xml_id: 1000 + i * 10 + n })),
  winnerId: i * 10 + 1,
}))
const WINNER = (i: number) => i * 10 + 1
const LOSER = (i: number) => i * 10 + 2

// Проходит раунды по очереди: true — верный выбор, false — неверный.
function play(answers: boolean[]) {
  let state = createGame(ROUNDS)
  answers.forEach((correct, i) => {
    if (i > 0) state = nextRound(state)
    state = choose(state, correct ? WINNER(i) : LOSER(i))
  })
  return state
}

describe("криптошекели", () => {
  test("игра стартует с нулём криптошекелей", () => {
    expect(createGame(ROUNDS).coins).toBe(0)
  })
  test("верный выбор даёт +10", () => {
    expect(play([true]).coins).toBe(10)
  })
  test("неверный выбор не даёт криптошекелей", () => {
    expect(play([false]).coins).toBe(0)
  })
  test("третий верный подряд даёт ещё +5", () => {
    expect(play([true, true, true]).coins).toBe(35)
  })
  test("каждый следующий верный в серии тоже даёт +5", () => {
    expect(play([true, true, true, true]).coins).toBe(50)
  })
  test("ошибка обнуляет серию", () => {
    expect(play([true, true, false, true, true]).coins).toBe(40)
  })
})

describe("ранг", () => {
  const cases: [number, string][] = [
    [0, "sub3"], [19, "sub3"], [20, "sub5"], [39, "sub5"], [40, "LTN"], [49, "LTN"], [50, "MTN"], [59, "MTN"],
    [60, "HTN"], [69, "HTN"], [70, "chadlite"], [79, "chadlite"], [80, "chad"], [99, "chad"], [100, "true adam"],
  ]
  test.each(cases)("%i%% → %s", (percent, rank) => {
    expect(rankFor(percent)).toBe(rank)
  })

  test("лестница идёт от sub3 до true adam", () => {
    expect(RANKS.map((r) => r.name)).toEqual(["sub3", "sub5", "LTN", "MTN", "HTN", "chadlite", "chad", "true adam"])
  })
})

describe("ход игры", () => {
  test("после выбора раунд считается отвеченным", () => {
    const pick = currentPick(play([true]))
    expect(pick).toEqual({ productId: WINNER(0), correct: true })
  })
  test("до выбора у раунда нет ответа", () => {
    expect(currentPick(createGame(ROUNDS))).toBeNull()
  })
  test("второй выбор в том же раунде запрещён", () => {
    expect(() => choose(play([false]), WINNER(0))).toThrow(/уже/)
  })
  test("нельзя выбрать товар не из текущего раунда", () => {
    expect(() => choose(createGame(ROUNDS), WINNER(1))).toThrow(/раунд/)
  })
  test("нельзя перейти дальше, не выбрав товар", () => {
    expect(() => nextRound(createGame(ROUNDS))).toThrow(/выбери/)
  })
  test("игра заканчивается после десятого раунда", () => {
    const nine = play(Array(9).fill(true))
    expect(isFinished(nextRound(nine))).toBe(false)
    const ten = choose(nextRound(nine), WINNER(9))
    expect(isFinished(nextRound(ten))).toBe(true)
  })
})

describe("подсказка", () => {
  // После двух верных: 20 криптошекелей, текущий раунд 2 — товары 21 (победитель), 22, 23.
  const thirdRound = () => nextRound(play([true, true]))
  const first = () => 0
  const last = () => 0.99

  test("убирает неверный вариант, выбранный случайно", () => {
    expect(removedId(useHint(thirdRound(), first))).toBe(22)
    expect(removedId(useHint(thirdRound(), last))).toBe(23)
  })
  test("никогда не убирает победителя", () => {
    for (let i = 0; i < 20; i++) expect(removedId(useHint(thirdRound(), () => i / 20))).not.toBe(21)
  })
  test("стоит 15 криптошекелей", () => {
    expect(HINT_COST).toBe(15)
    expect(useHint(thirdRound(), first).coins).toBe(5)
  })
  test("до подсказки в раунде ничего не убрано", () => {
    expect(removedId(thirdRound())).toBeNull()
  })
  test("недоступна, если криптошекелей меньше 15", () => {
    const state = nextRound(play([true])) // 10 криптошекелей
    expect(canUseHint(state)).toBe(false)
    expect(() => useHint(state, first)).toThrow(/подсказк.*15/)
  })
  test("при балансе ровно 15 доступна и оставляет 0, в минус не уходит", () => {
    // 30 криптошекелей → подсказка → 15, неверный выбор → следующая подсказка → 0.
    let state = nextRound(play([true, false, true, false, true]))
    state = useHint(state, last)
    expect(state.coins).toBe(15)
    state = nextRound(choose(state, LOSER(5)))
    expect(canUseHint(state)).toBe(true)
    state = useHint(state, first)
    expect(state.coins).toBe(0)
    expect(canUseHint(state)).toBe(false)
  })
  test("один раз за раунд", () => {
    const state = useHint(nextRound(play([true, true, true])), first)
    expect(state.coins).toBe(20)
    expect(canUseHint(state)).toBe(false)
    expect(() => useHint(state, first)).toThrow(/подсказк.*уже/)
  })
  test("недоступна после выбора", () => {
    expect(canUseHint(play([true, true]))).toBe(false)
    expect(() => useHint(play([true, true, true]), first)).toThrow(/подсказк.*до выбора/)
  })
  test("доступность считается по общему кошельку, если его баланс передан", () => {
    const fresh = createGame(ROUNDS) // за эту игру заработано 0
    expect(canUseHint(fresh)).toBe(false)
    expect(canUseHint(fresh, 100)).toBe(true)
    expect(canUseHint(fresh, 14)).toBe(false)
  })
  test("подсказка за счёт кошелька: баланс игры уходит в минус, кошелёк решает, хватает ли", () => {
    const fresh = createGame(ROUNDS)
    expect(useHint(fresh, first, 20).coins).toBe(-HINT_COST)
    expect(() => useHint(fresh, first, 10)).toThrow(/подсказк.*15.*у тебя 10/)
  })
  test("убранный товар нельзя выбрать", () => {
    const state = useHint(thirdRound(), first)
    expect(() => choose(state, 22)).toThrow(/убран подсказкой/)
  })
  test("не трогает исходное состояние", () => {
    const before = thirdRound()
    useHint(before, first)
    expect(before.coins).toBe(20)
    expect(removedId(before)).toBeNull()
  })
})

describe("итог", () => {
  test("процент, ранг, криптошекели и выбранные товары", () => {
    const state = nextRound(play([true, false, true, true, false, true, true, true, false, true]))
    const done = { ...state, index: ROUNDS.length }
    const result = summary(done)
    expect(result).toMatchObject({ correct: 7, total: 10, percent: 70, rank: "chadlite" })
    expect(result.picked.map((p) => p.id)).toEqual([1, 12, 21, 31, 42, 51, 61, 71, 82, 91])
    expect(result.xmlIds).toEqual(result.picked.map((p) => p.xml_id))
  })

  test("10 из 10 — true adam", () => {
    const state = play(Array(10).fill(true))
    expect(summary(state).rank).toBe("true adam")
  })
})
