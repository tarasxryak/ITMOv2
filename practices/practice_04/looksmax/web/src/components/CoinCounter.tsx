import { coinsWord } from "@/lib/format"

export function CoinCounter({ coins }: { coins: number }) {
  return (
    <p className="flex items-center gap-2" aria-live="polite">
      <span aria-hidden="true" className="size-5 rounded-full border-2 border-spruce bg-coin shadow-[inset_-2px_-2px_0_rgb(0_0_0/.15)]" />
      <span className="font-display text-xl font-extrabold tabular-nums">{coins}</span>
      <span className="text-sm text-muted-foreground">{coinsWord(coins)}</span>
    </p>
  )
}
