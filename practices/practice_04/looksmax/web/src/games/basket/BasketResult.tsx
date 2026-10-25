import { RotateCcw, Shuffle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RankLadder } from "@/components/RankLadder"
import { scoreBasket, type Challenge } from "@/lib/basket"
import { num, rub } from "@/lib/format"
import type { Product } from "@/lib/types"
import { Receipt, type Mark } from "./Receipt"

type Props = { challenge: Challenge; selected: Product[]; onRetry: () => void; onNewChallenge: () => void }

export function BasketResult({ challenge, selected, onRetry, onNewChallenge }: Props) {
  const result = scoreBasket(challenge, selected)
  const yourMarks = new Map<number, Mark>(result.extra.map((p) => [p.id, "extra"]))
  const bestMarks = new Map<number, Mark>(result.missed.map((p) => [p.id, "missed"]))
  const gap = result.best.totals.protein - result.totals.protein

  return (
    <section className="mx-auto w-full max-w-6xl space-y-10 px-4 pb-20 pt-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div>
          <p className="text-muted-foreground">Твоя корзина набрала от лучшей за {rub(challenge.budget)}</p>
          <h1
            className="font-display text-6xl font-black leading-none tracking-tight tabular-nums sm:text-8xl"
            tabIndex={-1}
            ref={(el) => el?.focus({ preventScroll: true })}
          >
            {num(result.efficiency, 1)}%
          </h1>
          <p className="mt-4 flex flex-wrap items-center gap-3 text-lg">
            Ранг
            <Badge className="px-3 py-1 font-display text-lg font-bold">{result.rank}</Badge>
          </p>
          <p className="mt-4 max-w-xl text-lg">
            {result.isBest
              ? "Это лучшая корзина за эти деньги. Перебор всех вариантов не нашёл ничего с большим белком."
              : `У тебя ${num(result.totals.protein, 0)} г белка, у лучшей корзины ${num(result.best.totals.protein, 0)} г. Не хватило ${num(gap, 0)} г.`}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" onClick={onNewChallenge}>
              <Shuffle aria-hidden="true" /> Другой набор
            </Button>
            <Button size="lg" variant="outline" onClick={onRetry}>
              <RotateCcw aria-hidden="true" /> Этот же набор ещё раз
            </Button>
          </div>
        </div>
        <aside>
          <RankLadder current={result.rank} />
        </aside>
      </div>

      <div>
        <h2 className="font-display text-2xl font-extrabold">Твоя корзина и лучшая</h2>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          {result.missed.length > 0
            ? `Лучшая корзина берёт ${result.missed.length === 1 ? "товар" : "товары"}, которые ты пропустил, и обходится ${rub(result.best.totals.price)}.`
            : "Корзины совпали по белку."}
        </p>
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <Receipt challenge={challenge} items={selected} title="Твоя корзина" marks={yourMarks} />
          <Receipt challenge={challenge} items={result.best.items} title="Лучшая корзина" marks={bestMarks} />
        </div>
      </div>
    </section>
  )
}
