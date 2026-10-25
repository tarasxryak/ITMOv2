// Профиль игрока: один кошелёк криптошекелей на дуэль, кликер и магазин тем. Все функции чистые.
import { clickPower, clickUpgradeCost, costOf, cpsOf, UPGRADES, upgradeById, type Owned, type UpgradeId } from "./clicker"
import { DEFAULT_THEME, isThemeId, themeById, THEMES, type ThemeId } from "./themes"

/** Вкладка в фоне может «проспать» минуты: за один tick не начисляем больше этого. */
export const MAX_TICK_SECONDS = 5

export type Profile = {
  balance: number
  /** Сколько заработано за всё время; траты его не уменьшают. */
  totalEarned: number
  clicks: number
  clickLevel: number
  owned: Owned
  themes: ThemeId[]
  theme: ThemeId
}

const FREE_THEMES = THEMES.filter((t) => t.price === 0).map((t) => t.id)

export function createProfile(): Profile {
  return { balance: 0, totalEarned: 0, clicks: 0, clickLevel: 0, owned: {}, themes: [...FREE_THEMES], theme: DEFAULT_THEME }
}

function checkAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`сумма должна быть конечным числом не меньше нуля, передано ${amount}`)
  }
}

export function earn(profile: Profile, amount: number): Profile {
  checkAmount(amount)
  return { ...profile, balance: profile.balance + amount, totalEarned: profile.totalEarned + amount }
}

export function spend(profile: Profile, amount: number): Profile {
  checkAmount(amount)
  if (amount > profile.balance) throw new Error(`не хватает ${Math.ceil(amount - profile.balance)} криптошекелей`)
  return { ...profile, balance: profile.balance - amount }
}

export function click(profile: Profile): Profile {
  return { ...earn(profile, clickPower(profile.clickLevel)), clicks: profile.clicks + 1 }
}

export function tick(profile: Profile, seconds: number): Profile {
  if (!(seconds >= 0)) throw new Error(`время не может быть отрицательным, передано ${seconds}`)
  return earn(profile, cpsOf(profile.owned) * Math.min(seconds, MAX_TICK_SECONDS))
}

export function buyUpgrade(profile: Profile, id: UpgradeId): Profile {
  const owned = profile.owned[id] ?? 0
  const spent = spend(profile, costOf(upgradeById(id), owned))
  return { ...spent, owned: { ...profile.owned, [id]: owned + 1 } }
}

export function buyClickLevel(profile: Profile): Profile {
  return { ...spend(profile, clickUpgradeCost(profile.clickLevel)), clickLevel: profile.clickLevel + 1 }
}

export function buyTheme(profile: Profile, id: ThemeId): Profile {
  const theme = themeById(id)
  if (profile.themes.includes(id)) throw new Error(`тема «${theme.name}» уже куплена`)
  return { ...spend(profile, theme.price), themes: [...profile.themes, id] }
}

export function selectTheme(profile: Profile, id: ThemeId): Profile {
  const theme = themeById(id)
  if (!profile.themes.includes(id)) throw new Error(`тема «${theme.name}» ещё не куплена: сначала купи её за ${theme.price} криптошекелей`)
  return { ...profile, theme: id }
}

const nonNegative = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0)

// Всё из localStorage считается недоверенным: правим то, что можно, остальное сбрасываем по умолчанию.
export function parseProfile(raw: unknown): Profile {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return createProfile()
  const data = raw as Record<string, unknown>

  const owned: Owned = {}
  const rawOwned = typeof data.owned === "object" && data.owned !== null ? (data.owned as Record<string, unknown>) : {}
  for (const upgrade of UPGRADES) {
    const count = rawOwned[upgrade.id]
    if (typeof count === "number" && Number.isFinite(count) && count >= 1) owned[upgrade.id] = Math.floor(count)
  }

  const themes = [...FREE_THEMES]
  if (Array.isArray(data.themes)) {
    for (const id of data.themes) if (isThemeId(id) && !themes.includes(id)) themes.push(id)
  }

  return {
    balance: nonNegative(data.balance),
    totalEarned: nonNegative(data.totalEarned),
    clicks: Math.floor(nonNegative(data.clicks)),
    clickLevel: Math.floor(nonNegative(data.clickLevel)),
    owned,
    themes,
    theme: isThemeId(data.theme) && themes.includes(data.theme) ? data.theme : DEFAULT_THEME,
  }
}
