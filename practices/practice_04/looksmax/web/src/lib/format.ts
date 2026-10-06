export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

export const shekelsWord = (n: number) => plural(n, "криптошекель", "криптошекеля", "криптошекелей")

// Большие числа кликера: от миллиона сокращаем, иначе баланс не помещается в шапку.
const BIG_UNITS = [
  [1e12, "трлн"],
  [1e9, "млрд"],
  [1e6, "млн"],
] as const

function abbreviate(n: number): string | null {
  for (const [unit, name] of BIG_UNITS) {
    if (n >= unit) return `${(n / unit).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ${name}`
  }
  return null
}

export const formatShekels = (n: number) => abbreviate(Math.floor(n)) ?? Math.floor(n).toLocaleString("ru-RU")

export const formatRate = (n: number) => abbreviate(n) ?? n.toLocaleString("ru-RU", { maximumFractionDigits: 1 })

export const num = (n: number, digits = 1) =>
  n.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: digits })

export const rub = (n: number) => `${n.toLocaleString("ru-RU")} ₽`
