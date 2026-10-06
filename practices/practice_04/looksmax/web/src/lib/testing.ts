// Помощники для тестов: фабрика товара и настоящий каталог из public/catalog.json.
import { readFileSync } from "node:fs"
import path from "node:path"
import type { Product } from "./types"

export function makeProduct(partial: Partial<Product> & { id: number }): Product {
  return {
    xml_id: partial.id,
    name: `Товар ${partial.id}`,
    price: 100,
    unit: "шт",
    url: `https://vkusvill.ru/goods/${partial.id}/`,
    image: null,
    kbju: { protein: 10, fat: 5, carbs: 5, kcal: 100 },
    score: 0.4,
    category: `Категория ${partial.id}`,
    portion: { grams: 100, price: partial.price ?? 100 },
    ...partial,
  }
}

export function realCatalog(): Product[] {
  const file = path.join(import.meta.dirname, "..", "..", "public", "catalog.json")
  return JSON.parse(readFileSync(file, "utf8")) as Product[]
}
