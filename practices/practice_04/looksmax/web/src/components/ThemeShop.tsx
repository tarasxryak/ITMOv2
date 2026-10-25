import { useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { updateProfile, useProfile } from "@/hooks/useProfile"
import { formatShekels } from "@/lib/format"
import { buyTheme, selectTheme } from "@/lib/profile"
import { THEMES, type Theme } from "@/lib/themes"
import { cn } from "@/lib/utils"

function Swatch({ colors }: { colors: Theme["swatch"] }) {
  return (
    <div className="flex" aria-hidden="true">
      {colors.map((color, i) => (
        <span key={i} className="-ml-2 size-8 rounded-full border-2 border-card first:ml-0" style={{ background: color }} />
      ))}
    </div>
  )
}

// Покупка сразу включает тему: игрок хочет её увидеть, а не искать кнопку второй раз.
export function ThemeShop() {
  const owned = useProfile((p) => p.themes)
  const active = useProfile((p) => p.theme)
  const balance = useProfile((p) => p.balance)
  const [message, setMessage] = useState("")

  const buy = (theme: Theme) => {
    const result = updateProfile((p) => selectTheme(buyTheme(p, theme.id), theme.id))
    setMessage(result.ok ? `Тема «${theme.name}» куплена и включена.` : `Не получилось купить: ${result.error}.`)
  }
  const choose = (theme: Theme) => {
    const result = updateProfile((p) => selectTheme(p, theme.id))
    setMessage(result.ok ? `Включена тема «${theme.name}».` : result.error)
  }

  return (
    <div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {THEMES.map((theme) => {
          const isOwned = owned.includes(theme.id)
          const isActive = active === theme.id
          const affordable = balance >= theme.price
          return (
            <li key={theme.id} className={cn("panel flex flex-col gap-3 p-4", isActive && "border-foreground ring-2 ring-foreground")}>
              <Swatch colors={theme.swatch} />
              <div className="flex-1">
                <h3 className="font-display text-lg font-bold leading-tight">{theme.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{theme.description}</p>
              </div>
              {isActive ? (
                <Button size="lg" variant="secondary" disabled>
                  <Check aria-hidden="true" /> Включена
                </Button>
              ) : isOwned ? (
                <Button size="lg" variant="outline" onClick={() => choose(theme)}>
                  Включить
                </Button>
              ) : (
                <Button size="lg" onClick={() => buy(theme)} disabled={!affordable} aria-label={`Купить тему ${theme.name} за ${formatShekels(theme.price)}`}>
                  Купить за {formatShekels(theme.price)}
                </Button>
              )}
              {!isOwned && !affordable && (
                <p className="-mt-1 text-xs text-muted-foreground tabular-nums">не хватает {formatShekels(theme.price - balance)}</p>
              )}
            </li>
          )
        })}
      </ul>
      <p role="status" className="mt-3 min-h-5 text-sm text-muted-foreground">
        {message}
      </p>
    </div>
  )
}
