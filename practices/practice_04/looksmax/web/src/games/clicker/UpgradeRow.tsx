import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatShekels } from "@/lib/format"

type Props = {
  name: string
  description: string
  /** Что даёт одна копия: «+0,1 в секунду». */
  effect: string
  owned: number
  cost: number
  balance: number
  onBuy: () => void
}

export function UpgradeRow({ name, description, effect, owned, cost, balance, onBuy }: Props) {
  const affordable = balance >= cost
  return (
    <li className="panel grid items-center gap-x-4 gap-y-2 p-4 sm:grid-cols-[1fr_auto] sm:gap-y-1">
      <div className="min-w-0">
        <h3 className="flex flex-wrap items-center gap-2 font-medium leading-snug">
          {name}
          {owned > 0 && <Badge variant="secondary">×{owned}</Badge>}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        <p className="mt-1 text-sm font-semibold">{effect}</p>
      </div>
      <Button size="lg" onClick={onBuy} disabled={!affordable} aria-label={`Купить ${name} за ${formatShekels(cost)}`} className="h-11 whitespace-nowrap max-sm:w-full">
        Купить за {formatShekels(cost)}
      </Button>
      {!affordable && (
        <p className="text-xs text-muted-foreground tabular-nums max-sm:text-center sm:col-span-2 sm:text-right">не хватает {formatShekels(cost - balance)}</p>
      )}
    </li>
  )
}
