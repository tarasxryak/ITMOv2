import { Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ThemeShop } from "./ThemeShop"

export function ThemePicker() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Темы сайта">
          <Palette aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-extrabold">Темы сайта</DialogTitle>
          <DialogDescription>Купленные темы остаются в этом браузере. Криптошекели зарабатываются в дуэли и в кликере.</DialogDescription>
        </DialogHeader>
        <ThemeShop />
      </DialogContent>
    </Dialog>
  )
}
