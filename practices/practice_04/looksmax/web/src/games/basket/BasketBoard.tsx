import { ListChecks, Shuffle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { basketTotals, checkAdd, MAX_PER_CATEGORY, type Challenge } from "@/lib/basket"
import { num, rub } from "@/lib/format"
import type { Product } from "@/lib/types"
import { Receipt } from "./Receipt"
import { ShelfItem } from "./ShelfItem"

type Props = {
  challenge: Challenge
  selected: Product[]
  onToggle: (product: Product) => void
  onSubmit: () => void
  onNewChallenge: () => void
}

export function BasketBoard({ challenge, selected, onToggle, onSubmit, onNewChallenge }: Props) {
  const totals = basketTotals(selected)
  const submit = (
    <Button size="lg" className="h-12 w-full text-base" onClick={onSubmit} disabled={selected.length === 0}>
      Сдать корзину
    </Button>
  )

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-32 pt-6 lg:pb-20">
      <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">
        Корзина на {rub(challenge.budget)}
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Набери как можно больше белка. Лучшую корзину за эти деньги мы найдём перебором и покажем в конце.
      </p>
      <ul className="mt-4 flex flex-wrap items-center gap-2">
        <li><Badge variant="secondary">бюджет {rub(challenge.budget)}</Badge></li>
        <li><Badge variant="secondary">до {num(challenge.kcalCap, 0)} ккал</Badge></li>
        <li><Badge variant="secondary">по 1 шт. каждого товара</Badge></li>
        <li><Badge variant="secondary">не больше {MAX_PER_CATEGORY} из одной категории</Badge></li>
        <li>
          <Button variant="ghost" size="sm" onClick={onNewChallenge}>
            <Shuffle aria-hidden="true" /> Другой набор
          </Button>
        </li>
      </ul>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {challenge.products.map((product) => {
            const isSelected = selected.some((s) => s.id === product.id)
            return (
              <ShelfItem
                key={product.id}
                product={product}
                selected={isSelected}
                check={checkAdd(challenge, selected, product)}
                onToggle={() => onToggle(product)}
              />
            )
          })}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-4">
            <Receipt challenge={challenge} items={selected} title="Твой чек" onRemove={onToggle}>
              {submit}
            </Receipt>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t-[1.5px] border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-extrabold tabular-nums">{num(totals.protein, 0)} г белка</p>
            <p className="truncate text-xs text-muted-foreground tabular-nums">
              {rub(totals.price)} из {rub(challenge.budget)}, {num(totals.kcal, 0)} ккал
            </p>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="lg">
                <ListChecks aria-hidden="true" /> Чек ({selected.length})
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Твой чек</SheetTitle>
                <SheetDescription>Товары в корзине, бюджет, калории и белок</SheetDescription>
              </SheetHeader>
              <Receipt challenge={challenge} items={selected} title="Твой чек" onRemove={onToggle} className="rounded-none border-0">
                {submit}
              </Receipt>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </section>
  )
}
