import { useMemo, useState } from "react"
import { MotionConfig } from "motion/react"
import { TriangleAlert } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Header } from "@/components/Header"
import type { Mode } from "@/components/RulesDialog"
import { ThemeDecor } from "@/components/ThemeDecor"
import { BasketGame } from "@/games/basket/BasketGame"
import { ClickerGame } from "@/games/clicker/ClickerGame"
import { DuelGame } from "@/games/duel/DuelGame"
import { useCatalog } from "@/hooks/useCatalog"
import { useApplyTheme, useIncomeLoop } from "@/hooks/useProfile"
import { plural } from "@/lib/format"
import { rngFromLocation } from "@/lib/seed"

function Loading() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-10 md:grid-cols-3" aria-busy="true" aria-label="Загружаем каталог">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-96 rounded-[1.5rem]" />
      ))}
    </div>
  )
}

export default function App() {
  const [mode, setMode] = useState<Mode>("duel")
  const state = useCatalog()
  useIncomeLoop()
  useApplyTheme()
  // Один генератор на сессию: с ?seed=N вся сессия воспроизводима.
  const rng = useMemo(() => rngFromLocation(), [])

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider>
        <a
          href="#game"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          Перейти к игре
        </a>
        <ThemeDecor />
        <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)} className="min-h-dvh gap-0">
          <Header mode={mode} />
          <main id="game" className="flex-1">
            {mode !== "clicker" && state.status === "loading" && <Loading />}
            {mode !== "clicker" && state.status === "error" && (
              <div className="mx-auto w-full max-w-6xl px-4 py-10">
                <Alert variant="destructive">
                  <TriangleAlert aria-hidden="true" />
                  <AlertTitle>Игра не запустилась</AlertTitle>
                  <AlertDescription>{state.message}</AlertDescription>
                </Alert>
              </div>
            )}
            {/* Кликер не зависит от каталога товаров: он доступен, даже если каталог не загрузился. */}
            <TabsContent value="clicker" forceMount className="data-[state=inactive]:hidden">
              <ClickerGame />
            </TabsContent>
            {state.status === "ready" && (
              <>
                <TabsContent value="duel" forceMount className="data-[state=inactive]:hidden">
                  <DuelGame catalog={state.catalog} rng={rng} />
                </TabsContent>
                <TabsContent value="basket" forceMount className="data-[state=inactive]:hidden">
                  <BasketGame catalog={state.catalog} rng={rng} />
                </TabsContent>
              </>
            )}
          </main>
          <footer className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-muted-foreground">
            {state.status === "ready"
              ? `В каталоге ${state.catalog.length} ${plural(state.catalog.length, "товар", "товара", "товаров")} ВкусВилла: названия, цены и КБЖУ из MCP ВкусВилла.`
              : "Данные о товарах берутся из MCP ВкусВилла."}
          </footer>
        </Tabs>
      </TooltipProvider>
    </MotionConfig>
  )
}
