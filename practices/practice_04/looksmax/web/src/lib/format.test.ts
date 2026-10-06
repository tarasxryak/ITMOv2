import { describe, expect, test } from "vitest"
import { coinsWord, num, plural, rub } from "./format"

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

  test("слово «коин» согласуется с числом", () => {
    expect([1, 2, 5, 15, 21].map(coinsWord)).toEqual(["коин", "коина", "коинов", "коинов", "коин"])
  })
})
