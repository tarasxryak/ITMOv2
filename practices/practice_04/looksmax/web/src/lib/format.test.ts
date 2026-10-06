import { describe, expect, test } from "vitest"
import { formatRate, formatShekels, num, plural, rub, shekelsWord } from "./format"

const flat = (s: string) => s.replace(/\s/g, " ")

describe("plural", () => {
  test.each([
    [1, "товар"], [2, "товара"], [4, "товара"], [5, "товаров"], [11, "товаров"], [12, "товаров"], [14, "товаров"],
    [21, "товар"], [22, "товара"], [25, "товаров"], [101, "товар"], [111, "товаров"], [0, "товаров"],
  ])("%i → %s", (n, word) => {
    expect(plural(n, "товар", "товара", "товаров")).toBe(word)
  })
})

describe("форматирование", () => {
  test("рубли с пробелом в разряде", () => {
    expect(flat(rub(1239))).toBe("1 239 ₽")
    expect(flat(rub(85))).toBe("85 ₽")
  })

  test("числа по-русски: запятая, без лишних нулей", () => {
    expect(num(16)).toBe("16")
    expect(num(16.04, 1)).toBe("16")
    expect(num(0.529, 3)).toBe("0,529")
    expect(num(98.6, 1)).toBe("98,6")
  })

  test("слово «криптошекель» согласуется с числом", () => {
    expect([1, 2, 5, 11, 21, 22, 100].map(shekelsWord)).toEqual([
      "криптошекель", "криптошекеля", "криптошекелей", "криптошекелей", "криптошекель", "криптошекеля", "криптошекелей",
    ])
  })
})

describe("formatShekels", () => {
  test.each([
    [0, "0"],
    [0.9, "0"],
    [999, "999"],
    [1234, "1 234"],
    [999999, "999 999"],
    [1_000_000, "1 млн"],
    [1_234_567, "1,23 млн"],
    [12_500_000, "12,5 млн"],
    [3_400_000_000, "3,4 млрд"],
    [2_000_000_000_000, "2 трлн"],
  ])("%d → %s", (value, text) => {
    expect(flat(formatShekels(value))).toBe(text)
  })
})

describe("formatRate", () => {
  test.each([
    [0.1, "0,1"],
    [47, "47"],
    [1234.5, "1 234,5"],
    [2_500_000, "2,5 млн"],
  ])("%d → %s", (value, text) => {
    expect(flat(formatRate(value))).toBe(text)
  })
})
