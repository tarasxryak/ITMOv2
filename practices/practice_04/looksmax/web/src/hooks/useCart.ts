import { useCallback, useState } from "react"
import { requestCartLink } from "@/lib/cart"

export type CartState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; link: string }
  | { status: "error"; message: string }

export function useCart() {
  const [cart, setCart] = useState<CartState>({ status: "idle" })

  const submit = useCallback(async (xmlIds: readonly number[]) => {
    setCart({ status: "loading" })
    try {
      setCart({ status: "done", link: await requestCartLink(xmlIds) })
    } catch (error) {
      setCart({ status: "error", message: error instanceof Error ? error.message : "Не получилось собрать корзину" })
    }
  }, [])

  const reset = useCallback(() => setCart({ status: "idle" }), [])
  return { cart, submit, reset }
}
