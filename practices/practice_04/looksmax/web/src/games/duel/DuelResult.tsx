import { RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CartAction } from "@/components/CartAction"
import { RankLadder } from "@/components/RankLadder"
import type { CartState } from "@/hooks/useCart"
import { coinsWord, num, rub } from "@/lib/format"
import { summary, type Game } from "@/lib/game"
import { cn } from "@/lib/utils"

type Props = { game: Game; cart: CartState; onCart: () => void; onRestart: () => void }

export function DuelResult({ game, cart, onCart, onRestart }: Props) {
  const result = summary(game)
  const total = result.picked.reduce((sum, p) => sum + p.price, 0)

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 pb-20 pt-8 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-8">
        <div>
          <p className="text-muted-foreground">Твой ранг</p>
          <h1
            className="font-display text-6xl font-black leading-none tracking-tight sm:text-8xl"
            tabIndex={-1}
            ref={(el) => el?.focus({ preventScroll: true })}
          >
            {result.rank}
          </h1>
          <p className="mt-4 text-lg">
            <strong className="font-display tabular-nums">{result.percent}%</strong> верных: {result.correct} из {result.total}. На счету{" "}
            <strong className="font-display tabular-nums">{result.coins}</strong> {coinsWord(result.coins)}.
          </p>
          <Button variant="outline" size="lg" className="mt-5" onClick={onRestart}>
            <RotateCcw aria-hidden="true" /> Сыграть ещё раз
          </Button>
        </div>

        <div className="rounded-2xl border-[1.5px] border-border bg-card p-5 sm:p-6">
          <h2 className="font-display text-2xl font-extrabold">Твоя корзина</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Твои выборы за {result.total} раундов, по одной штуке каждого.
          </p>
          <ul className="mt-4 divide-y divide-border">
            {result.picked.map((product, i) => {
              const right = game.picks[i].correct
              return (
                <li key={product.id} className="flex items-start gap-3 py-3">
                  <Badge
                    className={cn(
                      "mt-0.5 w-14 shrink-0 justify-center",
                      right ? "border-fresh/40 bg-fresh-soft text-fresh-ink" : "border-tomato/40 bg-tomato-soft text-tomato-ink",
                    )}
                  >
                    {right ? "верно" : "мимо"}
                  </Badge>
                  <span className="min-w-0 flex-1">
                    <span className="block leading-snug">{product.name}</span>
                    <span className="text-sm text-muted-foreground">скор {num(product.score, 3)}</span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">{rub(product.price)}</span>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 flex items-baseline justify-between border-t border-border pt-3 text-base">
            <span>Итого по ценникам</span>
            <strong className="font-display text-2xl font-extrabold tabular-nums">{rub(total)}</strong>
          </p>
          <div className="mt-5">
            <CartAction cart={cart} onSubmit={onCart} />
          </div>
        </div>
      </div>

      <aside>
        <RankLadder current={result.rank} />
      </aside>
    </section>
  )
}
