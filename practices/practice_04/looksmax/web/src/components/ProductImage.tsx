import { useState } from "react"
import { cn } from "@/lib/utils"
import type { Product } from "@/lib/types"

// Запасные плитки, если фото не загрузилось: цвет зависит от категории, так что ряд не выглядит одинаковым.
const TINTS = ["#cfe5dc", "#f6e3a1", "#d5e4f2", "#f3d6cf", "#dde3c4", "#e4d9ee"]

function tintFor(product: Product): string {
  const key = product.category ?? product.name
  let hash = 0
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return TINTS[hash % TINTS.length]
}

export function ProductImage({ product, className }: { product: Product; className?: string }) {
  const [failed, setFailed] = useState(false)

  if (!product.image || failed) {
    return (
      <div
        className={cn("flex aspect-square flex-col items-start justify-between rounded-2xl p-3 text-spruce dark:brightness-[.78] dark:saturate-75", className)}
        style={{ background: tintFor(product) }}
        aria-hidden="true"
      >
        <span className="font-display text-4xl font-black leading-none">{product.name.charAt(0)}</span>
        <span className="text-xs font-medium opacity-80">{product.category ?? "Без категории"}</span>
      </div>
    )
  }
  return (
    <div className={cn("aspect-square overflow-hidden rounded-2xl bg-white", className)}>
      <img
        src={product.image}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="size-full object-contain p-2"
      />
    </div>
  )
}
