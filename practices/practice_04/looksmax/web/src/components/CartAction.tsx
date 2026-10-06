import { ExternalLink, Loader2, ShoppingBasket, TriangleAlert } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { CartState } from "@/hooks/useCart"

type Props = { cart: CartState; disabled?: boolean; onSubmit: () => void }

// Кнопка «собрать корзину во ВкусВилле» и три исхода: ссылка, ошибка или ожидание.
// Ошибка не ломает экран результата: игра уже сыграна, корзину можно попробовать ещё раз.
export function CartAction({ cart, disabled, onSubmit }: Props) {
  return (
    <div className="space-y-3">
      {cart.status === "done" ? (
        <Button asChild size="lg" className="w-full">
          <a href={cart.link} target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden="true" /> Открыть корзину во ВкусВилле
          </a>
        </Button>
      ) : (
        <Button size="lg" className="w-full" onClick={onSubmit} disabled={disabled || cart.status === "loading"}>
          {cart.status === "loading" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ShoppingBasket aria-hidden="true" />}
          {cart.status === "loading" ? "Собираем корзину…" : "Собрать корзину во ВкусВилле"}
        </Button>
      )}
      <div aria-live="polite">
        {cart.status === "error" && (
          <Alert variant="destructive">
            <TriangleAlert aria-hidden="true" />
            <AlertTitle>Корзину собрать не получилось</AlertTitle>
            <AlertDescription>{cart.message} Результат игры никуда не делся.</AlertDescription>
          </Alert>
        )}
        {cart.status === "done" && (
          <p className="break-all text-sm text-muted-foreground">Ссылка на корзину: {cart.link}</p>
        )}
      </div>
    </div>
  )
}
