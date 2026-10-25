import type { Product } from "./types"

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v)
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v)
const isNullableString = (v: unknown) => v === null || typeof v === "string"

function fail(index: number, field: string): never {
  throw new Error(`каталог повреждён: запись ${index}, поле ${field}`)
}

function checkEntry(entry: unknown, index: number): Product {
  if (!isObject(entry)) fail(index, "запись")
  for (const field of ["id", "xml_id", "price", "score"]) if (!isNumber(entry[field])) fail(index, field)
  for (const field of ["name", "url"]) if (typeof entry[field] !== "string") fail(index, field)
  if (entry.unit !== "шт" && entry.unit !== "кг") fail(index, "unit")
  if (!isNullableString(entry.image)) fail(index, "image")
  if (!isNullableString(entry.category)) fail(index, "category")
  const kbju = entry.kbju
  if (!isObject(kbju) || !["protein", "fat", "carbs", "kcal"].every((k) => isNumber(kbju[k]))) fail(index, "kbju")
  const portion = entry.portion
  if (portion !== null && !(isObject(portion) && isNumber(portion.grams) && isNumber(portion.price))) fail(index, "portion")
  return entry as unknown as Product
}

export function parseCatalog(data: unknown): Product[] {
  if (!Array.isArray(data)) throw new Error("каталог повреждён: ожидался список товаров")
  return data.map(checkEntry)
}

export async function loadCatalog(
  fetchFn: typeof fetch = (input, init) => fetch(input, init),
  url = `${import.meta.env.BASE_URL}catalog.json`,
): Promise<Product[]> {
  let response: Response
  try {
    response = await fetchFn(url)
  } catch {
    throw new Error("Не получилось загрузить каталог товаров: проверь, что сервер игры запущен.")
  }
  if (response.status === 404) {
    throw new Error("Каталог товаров не найден. Собери его: .venv/bin/python scripts/build_catalog.py")
  }
  if (!response.ok) throw new Error(`Каталог товаров не загрузился: сервер ответил ${response.status}`)
  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new Error("каталог повреждён: это не JSON")
  }
  return parseCatalog(data)
}
