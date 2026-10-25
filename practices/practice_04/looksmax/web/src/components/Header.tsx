import { MousePointerClick, ShoppingBasket, Swords } from "lucide-react"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RulesDialog, type Mode } from "./RulesDialog"
import { ShekelCounter } from "./ShekelCounter"
import { ThemePicker } from "./ThemePicker"

export function Header({ mode }: { mode: Mode }) {
  return (
    <header className="border-b-[1.5px] border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3">
        <a href="./" className="font-display text-sm font-extrabold leading-[1.05] sm:text-base">
          Looksmax
          <br />
          Grocery
        </a>
        <TabsList className="order-3 h-11 w-full sm:order-none sm:w-auto" aria-label="Режим игры">
          <TabsTrigger value="duel" className="gap-2 px-3 text-sm sm:px-4 sm:text-base">
            <Swords aria-hidden="true" /> Дуэль
          </TabsTrigger>
          <TabsTrigger value="basket" className="gap-2 px-3 text-sm sm:px-4 sm:text-base">
            <ShoppingBasket aria-hidden="true" /> Корзина
          </TabsTrigger>
          <TabsTrigger value="clicker" className="gap-2 px-3 text-sm sm:px-4 sm:text-base">
            <MousePointerClick aria-hidden="true" /> Кликер
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-1">
          <ShekelCounter />
          <RulesDialog mode={mode} />
          <ThemePicker />
        </div>
      </div>
    </header>
  )
}
