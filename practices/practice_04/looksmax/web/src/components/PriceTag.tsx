import { cn } from "@/lib/utils"
import { num, rub } from "@/lib/format"
import type { Product } from "@/lib/types"
import { ProductImage } from "./ProductImage"
import { Ruler, type RulerTone } from "./Ruler"

export type TagState = "idle" | "winner" | "wrong" | "removed" | "dim"

const STAMP: Partial<Record<TagState, { text: string; className: string }>> = {
  winner: { text: "мог", className: "border-fresh text-fresh-ink" },
  wrong: { text: "мимо", className: "border-tomato text-tomato-ink" },
}

type Props = {
  product: Product
  state: TagState
  revealed: boolean
  disabled: boolean
  /** Порядковый номер на полке: сдвигает старт анимации линейки. */
  index: number
  onSelect: () => void
}

export function PriceTag({ product, state, revealed, disabled, index, onSelect }: Props) {
  const tone: RulerTone = state === "winner" ? "winner" : state === "wrong" ? "wrong" : "neutral"
  const stamp = STAMP[state]
  const label = state === "removed" ? `${product.name}, убран мьюингом` : `${product.name}, ${rub(product.price)}`

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-label={label}
      data-state={state}
      className={cn(
        "tag-card group flex min-w-0 flex-col overflow-hidden text-left",
        "enabled:cursor-pointer enabled:hover:-translate-y-1.5 enabled:hover:border-foreground enabled:active:translate-y-0",
        state === "winner" && "border-fresh ring-2 ring-fresh",
        state === "wrong" && "border-tomato ring-2 ring-tomato",
        state === "removed" && "opacity-45 saturate-0",
        state === "dim" && "opacity-80",
        "max-md:before:hidden",
      )}
    >
      <div className="flex gap-3 p-4 md:flex-col md:pt-9">
        <ProductImage product={product} className="w-28 shrink-0 md:w-full" />
        <div className="min-w-0">
          <h3 className="line-clamp-3 text-base font-medium leading-snug text-card-foreground">{product.name}</h3>
          {product.category && <p className="mt-1 text-sm text-muted-foreground">{product.category}</p>}
        </div>
      </div>

      {revealed ? (
        <div className="px-4 pb-4">
          <div className="flex items-end justify-between gap-2">
            <span className="text-sm text-muted-foreground">белки × 4 / ккал</span>
            <span className="font-display text-2xl font-extrabold tabular-nums">{num(product.score, 3)}</span>
          </div>
          <Ruler value={product.score} tone={tone} delay={0.2 + index * 0.15} className="mt-2" />
          <dl className="mt-3 grid grid-cols-4 gap-2 text-sm">
            {[
              ["белки", product.kbju.protein],
              ["жиры", product.kbju.fat],
              ["углеводы", product.kbju.carbs],
              ["ккал", product.kbju.kcal],
            ].map(([name, value]) => (
              <div key={name}>
                <dt className="text-xs text-muted-foreground">{name}</dt>
                <dd className="font-semibold tabular-nums">{num(value as number)}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <p className="px-4 pb-4 text-sm text-muted-foreground">Белки, жиры и углеводы откроются после выбора</p>
      )}

      <div className="tag-strip mt-auto flex items-baseline justify-between gap-2 px-4 py-3">
        <span className="font-display text-2xl font-extrabold tabular-nums">{rub(product.price)}</span>
        <span className="text-sm font-medium">за {product.unit}</span>
      </div>

      {stamp && (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute right-3 top-3 -rotate-6 rounded-lg border-[3px] bg-card/90 px-3 py-1 font-display text-xl font-black",
            stamp.className,
          )}
        >
          {stamp.text}
        </span>
      )}
      {state === "removed" && (
        <span className="absolute inset-x-0 top-1/3 text-center font-display text-lg font-bold text-foreground" aria-hidden="true">
          убран мьюингом
        </span>
      )}
    </button>
  )
}
