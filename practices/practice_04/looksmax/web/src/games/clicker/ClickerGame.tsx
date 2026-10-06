import { useState } from "react"
import { ThemeShop } from "@/components/ThemeShop"
import { updateProfile, useProfile } from "@/hooks/useProfile"
import { CLICK_UPGRADE, clickPower, clickUpgradeCost, costOf, cpsOf, UPGRADES } from "@/lib/clicker"
import { formatRate, formatShekels, plural, shekelsWord } from "@/lib/format"
import { buyClickLevel, buyUpgrade, click } from "@/lib/profile"
import { CoinButton } from "./CoinButton"
import { UpgradeRow } from "./UpgradeRow"

export function ClickerGame() {
  const balance = useProfile((p) => p.balance)
  const owned = useProfile((p) => p.owned)
  const clickLevel = useProfile((p) => p.clickLevel)
  const clicks = useProfile((p) => p.clicks)
  const totalEarned = useProfile((p) => p.totalEarned)
  const [message, setMessage] = useState("")

  const cps = cpsOf(owned)
  const power = clickPower(clickLevel)

  const buy = (name: string, change: Parameters<typeof updateProfile>[0]) => {
    const result = updateProfile(change)
    setMessage(result.ok ? `Куплено: ${name}.` : `Не получилось купить: ${result.error}.`)
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 pb-20 pt-6 lg:grid-cols-[22rem_1fr]">
      <div className="lg:sticky lg:top-4 lg:self-start">
        <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">Майним криптошекели</h1>
        <p className="mt-2 text-muted-foreground">Кликай по монете, потом покупай автокликеры: они работают за тебя.</p>

        <div className="my-8">
          <CoinButton power={power} onClick={() => updateProfile(click)} />
        </div>

        <dl className="grid grid-cols-2 gap-3 text-center">
          <div className="panel col-span-2 p-4">
            <dt className="text-sm text-muted-foreground">Доход</dt>
            <dd className="font-display text-3xl font-extrabold tabular-nums">{formatRate(cps)}</dd>
            <dd className="text-sm text-muted-foreground">криптошекелей в секунду</dd>
          </div>
          <div className="panel p-3">
            <dt className="text-xs text-muted-foreground">За клик</dt>
            <dd className="font-display text-xl font-extrabold tabular-nums">+{power}</dd>
          </div>
          <div className="panel p-3">
            <dt className="text-xs text-muted-foreground">Кликов</dt>
            <dd className="font-display text-xl font-extrabold tabular-nums">{formatShekels(clicks)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Всего заработано {formatShekels(totalEarned)} {shekelsWord(Math.floor(totalEarned))}
        </p>
      </div>

      <div className="space-y-10">
        <div>
          <h2 className="font-display text-2xl font-extrabold">Улучшения</h2>
          <p role="status" className="mt-1 min-h-6 text-sm text-muted-foreground">
            {message}
          </p>
          <ul className="mt-2 space-y-3">
            <UpgradeRow
              name={CLICK_UPGRADE.name}
              description={CLICK_UPGRADE.description}
              effect={`Сейчас +${power} ${shekelsWord(power)} за клик`}
              owned={clickLevel}
              cost={clickUpgradeCost(clickLevel)}
              balance={balance}
              onBuy={() => buy(CLICK_UPGRADE.name, buyClickLevel)}
            />
            {UPGRADES.map((upgrade) => {
              const count = owned[upgrade.id] ?? 0
              return (
                <UpgradeRow
                  key={upgrade.id}
                  name={upgrade.name}
                  description={upgrade.description}
                  effect={`+${formatRate(upgrade.cps)} в секунду${count > 0 ? `, у тебя ${count} ${plural(count, "копия", "копии", "копий")}` : ""}`}
                  owned={count}
                  cost={costOf(upgrade, count)}
                  balance={balance}
                  onBuy={() => buy(upgrade.name, (p) => buyUpgrade(p, upgrade.id))}
                />
              )
            })}
          </ul>
        </div>

        <div>
          <h2 className="font-display text-2xl font-extrabold">Магазин тем</h2>
          <p className="mb-4 mt-1 text-muted-foreground">Темы меняют вид всего сайта. Куплена навсегда в этом браузере.</p>
          <ThemeShop />
        </div>
      </div>
    </section>
  )
}
