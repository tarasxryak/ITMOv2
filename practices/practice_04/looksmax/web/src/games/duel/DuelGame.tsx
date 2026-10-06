import { useCallback, useState } from "react"
import { TriangleAlert } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useCart } from "@/hooks/useCart"
import { drawRounds } from "@/lib/duel"
import { choose, createGame, isFinished, nextRound, summary, useHint as applyHint, type Game } from "@/lib/game"
import type { Rng } from "@/lib/rng"
import type { Product } from "@/lib/types"
import { DuelResult } from "./DuelResult"
import { DuelRound } from "./DuelRound"

const ROUNDS = 10

function newGame(catalog: Product[], rng: Rng): { game: Game } | { error: string } {
  try {
    return { game: createGame(drawRounds(catalog, rng, ROUNDS)) }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Не получилось собрать раунды" }
  }
}

export function DuelGame({ catalog, rng }: { catalog: Product[]; rng: Rng }) {
  const [state, setState] = useState(() => newGame(catalog, rng))
  const { cart, submit, reset } = useCart()

  const update = useCallback((change: (game: Game) => Game) => {
    setState((current) => ("game" in current ? { game: change(current.game) } : current))
  }, [])

  if ("error" in state) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <Alert variant="destructive">
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>Раунды собрать не получилось</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const { game } = state
  if (isFinished(game)) {
    return (
      <DuelResult
        game={game}
        cart={cart}
        onCart={() => submit(summary(game).xmlIds)}
        onRestart={() => {
          reset()
          setState(newGame(catalog, rng))
        }}
      />
    )
  }
  return (
    <DuelRound
      game={game}
      onChoose={(id) => update((g) => choose(g, id))}
      onHint={() => update((g) => applyHint(g))}
      onNext={() => update(nextRound)}
    />
  )
}
