import { Check, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProductImage } from "@/components/ProductImage"
import type { AddCheck } from "@/lib/basket"
import { num, rub } from "@/lib/format"
import type { Product } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = { product: Product; selected: boolean; check: AddCheck; onToggle: () => void }

export function ShelfItem({ product, selected, check, onToggle }: Props) {
  const portion = product.portion!
  const protein = (product.kbju.protein * portion.grams) / 100
  const kcal = (product.kbju.kcal * portion.grams) / 100
  const blocked = !selected && !check.ok

  return (
    <article
      data-selected={selected}
      className={cn(
        "tag-card flex min-w-0 flex-col overflow-hidden",
        selected && "border-foreground ring-2 ring-foreground",
        blocked && "opacity-60",
      )}
    >
      <div className="p-3 pt-8">
        <ProductImage product={product} />
      </div>
      <div className="flex-1 px-3 pb-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {product.unit === "кг" ? `весовой, порция ${portion.grams} г` : `${portion.grams} г`}
          {product.category ? `, ${product.category}` : ""}
        </p>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-xl font-extrabold tabular-nums">{num(protein, 0)} г</span>
          <span className="text-xs text-muted-foreground">белка, {num(kcal, 0)} ккал</span>
        </p>
        {blocked && !check.ok && <p className="mt-1.5 text-xs font-medium text-tomato-ink">{check.reason}</p>}
      </div>
      <div className="tag-strip flex items-center justify-between gap-2 px-3 py-2.5">
        <span className="whitespace-nowrap font-display text-lg font-extrabold tabular-nums sm:text-xl">{rub(portion.price)}</span>
        <Button
          size="sm"
          variant={selected ? "default" : "secondary"}
          disabled={blocked}
          onClick={onToggle}
          aria-pressed={selected}
          aria-label={`${selected ? "Убрать из корзины" : "Положить в корзину"}: ${product.name}, ${rub(portion.price)}`}
          className={cn(selected ? "bg-spruce text-tag hover:bg-spruce/90 dark:bg-spruce" : "bg-white/70 text-spruce hover:bg-white")}
        >
          {selected ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
          <span className="hidden sm:inline">{selected ? "В корзине" : "Взять"}</span>
        </Button>
      </div>
    </article>
  )
}
