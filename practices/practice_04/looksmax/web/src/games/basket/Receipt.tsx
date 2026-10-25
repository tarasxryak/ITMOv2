import type { ReactNode } from "react"
import { X } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { basketTotals, type Challenge } from "@/lib/basket"
import { num, rub } from "@/lib/format"
import type { Product } from "@/lib/types"
import { cn } from "@/lib/utils"

export type Mark = "missed" | "extra"

const MARK_TEXT: Record<Mark, string> = { missed: "ты не взял", extra: "нет в лучшей" }
const MARK_CLASS: Record<Mark, string> = { missed: "text-fresh-ink", extra: "text-tomato-ink" }

function Meter({ label, value, max, unit }: { label: string; value: number; max: number; unit: string }) {
  const share = max > 0 ? (value / max) * 100 : 0
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          <strong className="font-semibold">{num(value, 0)}</strong> из {num(max, 0)} {unit}
        </span>
      </div>
      <Progress
        value={Math.min(100, share)}
        aria-label={`${label}: ${num(value, 0)} из ${num(max, 0)} ${unit}`}
        className={cn("mt-1.5 h-2.5 bg-muted", share >= 90 ? "[&>div]:bg-coin" : "[&>div]:bg-foreground")}
      />
    </div>
  )
}

type Props = {
  challenge: Challenge
  items: Product[]
  title: string
  marks?: Map<number, Mark>
  onRemove?: (product: Product) => void
  children?: ReactNode
  className?: string
}

// Чек: что в корзине, сколько осталось бюджета и калорий и сколько белка набралось.
export function Receipt({ challenge, items, title, marks, onRemove, children, className }: Props) {
  const totals = basketTotals(items)
  return (
    <div className={cn("receipt px-5 pt-5", className)}>
      <h2 className="font-display text-xl font-extrabold">{title}</h2>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Чек пуст. Положи товары с полки: бюджет {rub(challenge.budget)}.</p>
      ) : (
        <ul className="mt-3 divide-y divide-dashed divide-border">
          {items.map((item) => {
            const mark = marks?.get(item.id)
            return (
              <li key={item.id} className="flex items-start gap-2 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 leading-snug">{item.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.portion!.grams} г, белок {num((item.kbju.protein * item.portion!.grams) / 100, 0)} г
                    {mark && <strong className={cn("ml-1.5 font-semibold", MARK_CLASS[mark])}>{MARK_TEXT[mark]}</strong>}
                  </span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{rub(item.portion!.price)}</span>
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(item)}
                    aria-label={`Убрать из корзины: ${item.name}`}
                    className="-mr-1 mt-0.5 grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-4 space-y-3 border-t-2 border-dashed border-border pt-4">
        <Meter label="Бюджет" value={totals.price} max={challenge.budget} unit="₽" />
        <Meter label="Калории" value={totals.kcal} max={challenge.kcalCap} unit="ккал" />
        <p className="flex items-baseline justify-between pt-1">
          <span className="text-muted-foreground">Белок</span>
          <span className="font-display text-3xl font-extrabold tabular-nums">{num(totals.protein, 0)} г</span>
        </p>
        <p className="text-right text-xs text-muted-foreground">
          жиры {num(totals.fat, 0)} г, углеводы {num(totals.carbs, 0)} г
        </p>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
