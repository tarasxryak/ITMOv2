// Игра «Кликер»: клик даёт криптошекели, автокликеры дают их каждую секунду. Все функции чистые.
export type UpgradeId = "autoclick" | "shaker" | "fridge" | "exchange" | "dietolog" | "asic"

export type Upgrade = {
  id: UpgradeId
  name: string
  description: string
  baseCost: number
  /** Криптошекелей в секунду от одной копии. */
  cps: number
}

export type Owned = Partial<Record<UpgradeId, number>>

/** Каждая следующая копия автокликера дороже предыдущей на 15 %. */
export const UPGRADE_GROWTH = 1.15

export const UPGRADES: readonly Upgrade[] = [
  { id: "autoclick", name: "Автокликер", description: "Кликает за тебя без перерывов и обеденных пауз.", baseCost: 15, cps: 0.1 },
  { id: "shaker", name: "Шейкер-майнер", description: "Взбалтывает протеин и блоки быстрее, чем ты читаешь состав.", baseCost: 100, cps: 1 },
  { id: "fridge", name: "Ферма в холодильнике", description: "Майнит между йогуртами и сырками, пока никто не видит.", baseCost: 1_100, cps: 8 },
  { id: "exchange", name: "Белковая биржа", description: "Торгует граммами белка на вечерних сессиях.", baseCost: 12_000, cps: 47 },
  { id: "dietolog", name: "Нейросеть-диетолог", description: "Считает КБЖУ быстрее тебя и берёт комиссию в криптошекелях.", baseCost: 130_000, cps: 260 },
  { id: "asic", name: "True Adam ASIC", description: "Майнит так, будто ты уже на вершине лестницы рангов.", baseCost: 1_400_000, cps: 1_400 },
]

export const CLICK_UPGRADE = {
  name: "Сила клика",
  description: "+1 криптошекель за каждый клик.",
  baseCost: 20,
  growth: 1.6,
}

export function upgradeById(id: UpgradeId): Upgrade {
  const upgrade = UPGRADES.find((u) => u.id === id)
  if (!upgrade) throw new Error(`автокликера «${id}» нет, есть: ${UPGRADES.map((u) => u.id).join(", ")}`)
  return upgrade
}

// Цена округляется вверх: так игрок не покупает копию за дробный остаток.
export function costOf(upgrade: Upgrade, owned: number): number {
  if (owned < 0) throw new Error(`число копий не может быть отрицательным, передано ${owned}`)
  return Math.ceil(upgrade.baseCost * UPGRADE_GROWTH ** owned)
}

export const clickUpgradeCost = (level: number) => Math.ceil(CLICK_UPGRADE.baseCost * CLICK_UPGRADE.growth ** level)

export const clickPower = (level: number) => 1 + level

export const cpsOf = (owned: Owned): number => UPGRADES.reduce((sum, u) => sum + (owned[u.id] ?? 0) * u.cps, 0)
