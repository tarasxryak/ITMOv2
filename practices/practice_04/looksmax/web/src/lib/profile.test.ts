import { describe, expect, test } from "vitest"
import { clickPower, costOf, UPGRADES } from "./clicker"
import {
  buyClickLevel,
  buyTheme,
  buyUpgrade,
  click,
  createProfile,
  earn,
  MAX_TICK_SECONDS,
  parseProfile,
  selectTheme,
  spend,
  tick,
  type Profile,
} from "./profile"
import { themeById } from "./themes"

const rich = (balance = 1_000_000): Profile => ({ ...createProfile(), balance })

describe("новый профиль", () => {
  test("пустой: ноль криптошекелей, две бесплатные темы, светлая включена", () => {
    expect(createProfile()).toEqual({
      balance: 0,
      totalEarned: 0,
      clicks: 0,
      clickLevel: 0,
      owned: {},
      themes: ["light", "dark"],
      theme: "light",
    })
  })
})

describe("earn и spend", () => {
  test("earn прибавляет к балансу и к заработанному за всё время", () => {
    const p = earn(createProfile(), 12)
    expect(p).toMatchObject({ balance: 12, totalEarned: 12 })
  })

  test("earn не принимает отрицательное, нечисло и бесконечность", () => {
    for (const bad of [-1, NaN, Infinity]) expect(() => earn(createProfile(), bad)).toThrow(/сумм/)
  })

  test("spend списывает только с баланса, заработанное за всё время не меняется", () => {
    const p = spend(earn(createProfile(), 50), 20)
    expect(p).toMatchObject({ balance: 30, totalEarned: 50 })
  })

  test("spend не уводит баланс в минус и говорит, сколько не хватает", () => {
    expect(() => spend(earn(createProfile(), 10), 25)).toThrow(/не хватает 15/)
  })

  test("не трогает исходный профиль", () => {
    const before = createProfile()
    earn(before, 5)
    expect(before.balance).toBe(0)
  })
})

describe("клик", () => {
  test("даёт силу клика, считает клики", () => {
    const p = click(click(createProfile()))
    expect(p).toMatchObject({ balance: 2, clicks: 2, totalEarned: 2 })
  })

  test("после улучшения клика даёт больше", () => {
    const p = click(buyClickLevel(rich(100)))
    expect(p.balance - (100 - 20)).toBe(clickPower(1))
  })
})

describe("доход автокликеров", () => {
  test("tick прибавляет доход в секунду × прошедшее время", () => {
    const p = tick({ ...createProfile(), owned: { shaker: 3 } }, 2)
    expect(p.balance).toBeCloseTo(6, 10)
    expect(p.totalEarned).toBeCloseTo(6, 10)
  })

  test("без автокликеров tick ничего не даёт", () => {
    expect(tick(createProfile(), 10).balance).toBe(0)
  })

  test("после долгого простоя вкладки время режется до MAX_TICK_SECONDS", () => {
    const p = tick({ ...createProfile(), owned: { shaker: 1 } }, 3600)
    expect(p.balance).toBeCloseTo(MAX_TICK_SECONDS, 10)
  })

  test("отрицательное время — ошибка", () => {
    expect(() => tick(createProfile(), -1)).toThrow(/время/)
  })
})

describe("покупка автокликера", () => {
  test("списывает цену и добавляет копию", () => {
    const p = buyUpgrade(rich(100), "autoclick")
    expect(p.balance).toBe(85)
    expect(p.owned).toEqual({ autoclick: 1 })
  })

  test("вторая копия стоит дороже первой", () => {
    const first = buyUpgrade(rich(1000), "autoclick")
    const second = buyUpgrade(first, "autoclick")
    expect(first.balance - second.balance).toBe(costOf(UPGRADES[0], 1))
  })

  test("не хватает денег — ошибка с недостающей суммой, профиль не меняется", () => {
    const poor = earn(createProfile(), 10)
    expect(() => buyUpgrade(poor, "autoclick")).toThrow(/не хватает 5/)
    expect(poor.owned).toEqual({})
  })

  test("неизвестный автокликер — ошибка", () => {
    expect(() => buyUpgrade(rich(), "bitcoin" as never)).toThrow(/bitcoin/)
  })
})

describe("покупка улучшения клика", () => {
  test("повышает уровень и списывает цену", () => {
    const p = buyClickLevel(rich(100))
    expect(p).toMatchObject({ clickLevel: 1, balance: 80 })
  })

  test("не хватает денег — ошибка", () => {
    expect(() => buyClickLevel(earn(createProfile(), 3))).toThrow(/не хватает 17/)
  })
})

describe("темы", () => {
  test("покупка списывает цену и открывает тему, но не включает её", () => {
    const price = themeById("sakura").price
    const p = buyTheme(rich(1000), "sakura")
    expect(p.balance).toBe(1000 - price)
    expect(p.themes).toContain("sakura")
    expect(p.theme).toBe("light")
  })

  test("не хватает денег — ошибка, тема не открывается", () => {
    const poor = earn(createProfile(), 100)
    expect(() => buyTheme(poor, "sakura")).toThrow(/не хватает/)
    expect(poor.themes).not.toContain("sakura")
  })

  test("купленную тему повторно не купить", () => {
    const p = buyTheme(rich(5000), "sakura")
    expect(() => buyTheme(p, "sakura")).toThrow(/уже куплена/)
  })

  test("бесплатные темы уже открыты, покупать нечего", () => {
    expect(() => buyTheme(rich(), "dark")).toThrow(/уже куплена/)
  })

  test("выбрать можно только открытую тему", () => {
    expect(() => selectTheme(rich(), "cyberpunk")).toThrow(/сначала купи/)
    expect(selectTheme(buyTheme(rich(5000), "cyberpunk"), "cyberpunk").theme).toBe("cyberpunk")
    expect(selectTheme(createProfile(), "dark").theme).toBe("dark")
  })
})

describe("parseProfile: восстановление из localStorage", () => {
  test("сохранённый профиль читается без потерь", () => {
    const p = selectTheme(buyTheme(buyUpgrade(earn(createProfile(), 3000), "autoclick"), "sakura"), "sakura")
    expect(parseProfile(JSON.parse(JSON.stringify(p)))).toEqual(p)
  })

  test("мусор вместо профиля — новый профиль", () => {
    for (const bad of [null, undefined, "строка", 42, [], true]) expect(parseProfile(bad)).toEqual(createProfile())
  })

  test("недостающие поля берутся по умолчанию", () => {
    expect(parseProfile({ balance: 77 })).toEqual({ ...createProfile(), balance: 77 })
  })

  test("отрицательные и нечисловые значения сбрасываются в ноль", () => {
    const p = parseProfile({ balance: -5, totalEarned: "много", clicks: NaN, clickLevel: -2 })
    expect(p).toMatchObject({ balance: 0, totalEarned: 0, clicks: 0, clickLevel: 0 })
  })

  test("число копий округляется вниз, неизвестные автокликеры отбрасываются", () => {
    const p = parseProfile({ owned: { autoclick: 2.9, bitcoin: 5, shaker: -1, fridge: "3" } })
    expect(p.owned).toEqual({ autoclick: 2 })
  })

  test("бесплатные темы всегда открыты, неизвестные отбрасываются", () => {
    expect(parseProfile({ themes: ["sakura", "matrix"] }).themes).toEqual(["light", "dark", "sakura"])
  })

  test("включённая тема, которой нет среди открытых, заменяется светлой", () => {
    expect(parseProfile({ theme: "cyberpunk", themes: ["light", "dark"] }).theme).toBe("light")
    expect(parseProfile({ theme: "matrix" }).theme).toBe("light")
  })

  test("тема открыта и включена — остаётся", () => {
    expect(parseProfile({ theme: "cyberpunk", themes: ["cyberpunk"] }).theme).toBe("cyberpunk")
  })
})
