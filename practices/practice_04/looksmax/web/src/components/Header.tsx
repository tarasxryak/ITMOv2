import { Moon, Sun, Swords, ShoppingBasket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTheme } from "@/hooks/useTheme"
import { RulesDialog, type Mode } from "./RulesDialog"

export function Header({ mode }: { mode: Mode }) {
  const { dark, toggle } = useTheme()
  return (
    <header className="border-b-[1.5px] border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3">
        <a href="./" className="font-display text-sm font-extrabold leading-[1.05] sm:text-base">
          Looksmax
          <br />
          Grocery
        </a>
        <TabsList className="order-3 h-11 w-full sm:order-none sm:w-auto" aria-label="Режим игры">
          <TabsTrigger value="duel" className="gap-2 px-4 text-sm sm:text-base">
            <Swords aria-hidden="true" /> Дуэль
          </TabsTrigger>
          <TabsTrigger value="basket" className="gap-2 px-4 text-sm sm:text-base">
            <ShoppingBasket aria-hidden="true" /> Корзина на бюджет
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-1">
          <RulesDialog mode={mode} />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label={dark ? "Включить светлую тему" : "Включить тёмную тему"}
            aria-pressed={dark}
          >
            {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </Button>
        </div>
      </div>
    </header>
  )
}
