import { useProfile } from "@/hooks/useProfile"
import { formatShekels, shekelsWord } from "@/lib/format"

// Баланс общий для всех игр, поэтому живёт в шапке, а не на экране одной из них.
export function ShekelCounter() {
  const balance = useProfile((p) => Math.floor(p.balance))
  return (
    <p className="flex items-center gap-2" aria-live="off" aria-label={`Баланс: ${balance} ${shekelsWord(balance)}`}>
      <span aria-hidden="true" className="coin-chip size-6 shrink-0 rounded-full border-2 border-spruce bg-coin text-center text-xs font-bold leading-5 text-spruce">
        ₪
      </span>
      <span className="font-display text-lg font-extrabold tabular-nums">{formatShekels(balance)}</span>
      <span className="hidden text-sm text-muted-foreground md:inline">{shekelsWord(balance)}</span>
    </p>
  )
}
