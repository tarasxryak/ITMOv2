import { useState } from "react"
import { TriangleAlert } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { checkAdd, drawChallenge, type Challenge } from "@/lib/basket"
import type { Rng } from "@/lib/rng"
import type { Product } from "@/lib/types"
import { BasketBoard } from "./BasketBoard"
import { BasketResult } from "./BasketResult"

type State =
  | { error: string }
  | { challenge: Challenge; selected: Product[]; submitted: boolean }

function newChallenge(catalog: Product[], rng: Rng): State {
  try {
    return { challenge: drawChallenge(catalog, rng), selected: [], submitted: false }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Не получилось собрать набор" }
  }
}

export function BasketGame({ catalog, rng }: { catalog: Product[]; rng: Rng }) {
  const [state, setState] = useState<State>(() => newChallenge(catalog, rng))

  if ("error" in state) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <Alert variant="destructive">
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>Набор товаров собрать не получилось</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const { challenge, selected, submitted } = state
  const toggle = (product: Product) => {
    if (selected.some((p) => p.id === product.id)) {
      setState({ ...state, selected: selected.filter((p) => p.id !== product.id) })
    } else if (checkAdd(challenge, selected, product).ok) {
      setState({ ...state, selected: [...selected, product] })
    }
  }

  if (submitted) {
    return (
      <BasketResult
        challenge={challenge}
        selected={selected}
        onRetry={() => setState({ challenge, selected: [], submitted: false })}
        onNewChallenge={() => setState(newChallenge(catalog, rng))}
      />
    )
  }
  return (
    <BasketBoard
      challenge={challenge}
      selected={selected}
      onToggle={toggle}
      onSubmit={() => setState({ ...state, submitted: true })}
      onNewChallenge={() => setState(newChallenge(catalog, rng))}
    />
  )
}
