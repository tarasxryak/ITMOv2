import { describe, expect, test } from "vitest"
import { mulberry32, sample, shuffle } from "./rng"

describe("mulberry32", () => {
  test("один и тот же seed даёт одну и ту же последовательность", () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  test("разные seed дают разные последовательности", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)())
  })

  test("значения лежат в [0, 1)", () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 1000; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe("shuffle", () => {
  test("возвращает перестановку и не трогает исходный массив", () => {
    const source = [1, 2, 3, 4, 5, 6]
    const result = shuffle(source, mulberry32(3))
    expect([...result].sort()).toEqual(source)
    expect(source).toEqual([1, 2, 3, 4, 5, 6])
  })

  test("перемешивает: за 50 seed первый элемент бывает разным", () => {
    const firsts = new Set<number>()
    for (let seed = 0; seed < 50; seed++) firsts.add(shuffle([1, 2, 3, 4], mulberry32(seed))[0])
    expect(firsts.size).toBe(4)
  })
})

describe("sample", () => {
  test("берёт n разных элементов", () => {
    const result = sample([10, 20, 30, 40, 50], 3, mulberry32(9))
    expect(result).toHaveLength(3)
    expect(new Set(result).size).toBe(3)
    result.forEach((v) => expect([10, 20, 30, 40, 50]).toContain(v))
  })

  test("нельзя взять больше элементов, чем есть", () => {
    expect(() => sample([1, 2], 3, mulberry32(1))).toThrow(/3/)
  })
})
