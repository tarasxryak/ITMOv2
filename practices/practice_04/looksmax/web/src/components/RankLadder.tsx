import { RANKS, type RankName } from "@/lib/game"
import { cn } from "@/lib/utils"

// Сверху true adam, снизу sub3. Диапазон процентов считается из той же лестницы, что и ранг.
const LADDER = [...RANKS].reverse().map((rank, i, reversed) => {
  const upper = i === 0 ? 100 : reversed[i - 1].from - 1
  return { name: rank.name, label: rank.from === upper ? `${upper}%` : `${rank.from}–${upper}%` }
})

export function RankLadder({ current }: { current: RankName }) {
  return (
    <ol className="panel overflow-hidden" aria-label="Лестница рангов">
      {LADDER.map((rank) => {
        const active = rank.name === current
        return (
          <li
            key={rank.name}
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 last:border-b-0",
              active && "bg-spruce text-tag dark:bg-tag dark:text-spruce",
            )}
          >
            <span className="font-display text-lg font-bold">{rank.name}</span>
            <span className={cn("text-sm tabular-nums", active ? "font-semibold" : "text-muted-foreground")}>
              {active ? `твой, ${rank.label}` : rank.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
