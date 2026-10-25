import { useEffect, useRef } from "react"
import { Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PriceTag, type TagState } from "@/components/PriceTag"
import { shekelsWord, num } from "@/lib/format"
import { canUseHint, coinsForCorrect, currentPick, HINT_COST, removedId, STREAK_FROM, type Game } from "@/lib/game"
import { cn } from "@/lib/utils"

type Props = {
  game: Game
  /** Кошелёк игрока: от него зависит, хватает ли на подсказку. */
  balance: number
  onChoose: (productId: number) => void
  onHint: () => void
  onNext: () => void
}

function RoundProgress({ game }: { game: Game }) {
  return (
    <div className="flex items-center gap-3">
      <p className="font-display text-sm font-bold tabular-nums">
        Раунд {game.index + 1} из {game.rounds.length}
      </p>
      <ol className="flex gap-1" aria-hidden="true">
        {game.rounds.map((_, i) => {
          const pick = game.picks[i]
          return (
            <li
              key={i}
              className={cn(
                "h-2.5 w-4 rounded-full bg-muted sm:w-6",
                pick?.correct && "bg-fresh",
                pick && !pick.correct && "bg-tomato",
                i === game.index && !pick && "bg-foreground/60",
              )}
            />
          )
        })}
      </ol>
    </div>
  )
}

export function DuelRound({ game, balance, onChoose, onHint, onNext }: Props) {
  const round = game.rounds[game.index]
  const pick = currentPick(game)
  const removed = removedId(game)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const isLast = game.index === game.rounds.length - 1
  const winner = round.products.find((p) => p.id === round.winnerId)!

  // Новый раунд: фокус на заголовок, чтобы читалка и клавиатура начинали с начала раунда.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [game.index])

  const stateOf = (id: number): TagState => {
    if (removed === id) return "removed"
    if (!pick) return "idle"
    if (id === round.winnerId) return "winner"
    return pick.productId === id ? "wrong" : "dim"
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-5">
        <RoundProgress game={game} />
        <Button variant="outline" size="sm" onClick={onHint} disabled={!canUseHint(game, balance)}>
          <Sparkles aria-hidden="true" /> Подсказка за {HINT_COST}
        </Button>
      </div>

      <h1 ref={headingRef} tabIndex={-1} className="font-display text-3xl font-extrabold leading-tight outline-none sm:text-4xl">
        Где больше белка на калорию?
      </h1>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-muted-foreground">
        КБЖУ откроется после выбора. Подсказка убирает один неверный вариант.
        <Badge variant="secondary">скор = белки × 4 / ккал</Badge>
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {round.products.map((product, i) => (
          <PriceTag
            key={product.id}
            product={product}
            index={i}
            state={stateOf(product.id)}
            revealed={Boolean(pick)}
            disabled={Boolean(pick) || removed === product.id}
            onSelect={() => onChoose(product.id)}
          />
        ))}
      </div>

      <div role="status" className="mt-6 min-h-24">
        {pick && (
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-4 rounded-2xl border-[1.5px] p-5",
              pick.correct ? "border-fresh bg-fresh-soft text-fresh-ink" : "border-tomato bg-tomato-soft text-tomato-ink",
            )}
          >
            <div>
              <p className="font-display text-2xl font-extrabold">{pick.correct ? "Мог!" : "Мимо."}</p>
              <p className="mt-1 text-base">
                {pick.correct
                  ? `+${coinsForCorrect(game.streak)} ${shekelsWord(coinsForCorrect(game.streak))}${game.streak >= STREAK_FROM ? `, серия ${game.streak} подряд` : ""}`
                  : `Лучше был «${winner.name}»: скор ${num(winner.score, 3)}`}
              </p>
            </div>
            <Button size="lg" onClick={onNext} autoFocus>
              {isLast ? "Смотреть итог" : "Дальше"}
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
