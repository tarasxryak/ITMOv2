import type { Product } from "./types"

// Товары без категории считаются разными: у каждого своя.
export const categoryKey = (p: Product) => p.category ?? `#${p.id}`
