import { mulberry32, type Rng } from "./rng"

// ?seed=7 в адресе делает все раунды воспроизводимыми: так делаются скриншоты и разбираются баги.
export function rngFromLocation(search: string = window.location.search): Rng {
  const seed = new URLSearchParams(search).get("seed")
  return seed !== null && /^\d+$/.test(seed) ? mulberry32(Number(seed)) : Math.random
}
