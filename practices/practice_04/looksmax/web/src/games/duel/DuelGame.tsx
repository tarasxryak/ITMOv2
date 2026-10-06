import { useState } from "react"
import { TriangleAlert } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useCart } from "@/hooks/useCart"
import { updateProfile, useProfile } from "@/hooks/useProfile"
import { drawRounds } from "@/lib/duel"
import { choose, createGame, HINT_COST, isFinished, nextRound, summary, useHint as applyHint, type Game } from "@/lib/game"
import { earn, spend } from "@/lib/profile"
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

// Криптошекели общие для всех игр: награда и трата подсказки идут через профиль, а не через счёт этой игры.
export function DuelGame({ catalog, rng }: { catalog: Product[]; rng: Rng }) {
  const [state, setState] = useState(() => newGame(catalog, rng))
  const balance = useProfile((p) => p.balance)
  const { cart, submit, reset } = useCart()

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

  const onChoose = (productId: number) => {
    const next = choose(game, productId)
    setState({ game: next })
    const reward = next.coins - game.coins
    if (reward > 0) updateProfile((p) => earn(p, reward))
  }

  const onHint = () => {
    const next = applyHint(game, Math.random, balance)
    if (!updateProfile((p) => spend(p, HINT_COST)).ok) return
    setState({ game: next })
  }

  if (isFinished(game)) {
    return (
      <DuelResult
        game={game}
        balance={balance}
        cart={cart}
        onCart={() => submit(summary(game).xmlIds)}
        onRestart={() => {
          reset()
          setState(newGame(catalog, rng))
        }}
      />
    )
  }
  return <DuelRound game={game} balance={balance} onChoose={onChoose} onHint={onHint} onNext={() => setState({ game: nextRound(game) })} />
}
