import { useEffect, useState } from "react"
import { loadCatalog } from "@/lib/catalog"
import type { Product } from "@/lib/types"

export type CatalogState =
  | { status: "loading" }
  | { status: "ready"; catalog: Product[] }
  | { status: "error"; message: string }

export function useCatalog(): CatalogState {
  const [state, setState] = useState<CatalogState>({ status: "loading" })

  useEffect(() => {
    let cancelled = false
    loadCatalog()
      .then((catalog) => !cancelled && setState({ status: "ready", catalog }))
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: "error", message: error instanceof Error ? error.message : "Каталог не загрузился" })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
