// Запись каталога: то, что собирает scripts/build_catalog.py (см. core/catalog.py).
export type Kbju = { protein: number; fat: number; carbs: number; kcal: number }

// Порция для игры с бюджетом: масса и цена покупки (весовой товар — порция 500 г).
export type Portion = { grams: number; price: number }

export type Product = {
  id: number
  xml_id: number
  name: string
  price: number
  unit: "шт" | "кг"
  url: string
  image: string | null
  kbju: Kbju
  score: number
  category: string | null
  portion: Portion | null
}
