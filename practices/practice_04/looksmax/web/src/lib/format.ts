export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

export const coinsWord = (n: number) => plural(n, "коин", "коина", "коинов")

export const num = (n: number, digits = 1) =>
  n.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: digits })

export const rub = (n: number) => `${n.toLocaleString("ru-RU")} ₽`
