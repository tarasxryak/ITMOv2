export type Rng = () => number

// Детерминированный генератор: в тестах seed делает раунды воспроизводимыми, в игре берётся Math.random.
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function sample<T>(items: readonly T[], count: number, rng: Rng): T[] {
  if (count > items.length) throw new Error(`нельзя взять ${count} элементов из ${items.length}`)
  return shuffle(items, rng).slice(0, count)
}
