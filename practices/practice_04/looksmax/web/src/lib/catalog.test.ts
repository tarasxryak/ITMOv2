import { describe, expect, test } from "vitest"
import { loadCatalog, parseCatalog } from "./catalog"
import { realCatalog } from "./testing"

describe("parseCatalog", () => {
  test("настоящий каталог проходит проверку целиком", () => {
    const raw = realCatalog()
    expect(parseCatalog(raw)).toHaveLength(raw.length)
    expect(raw.length).toBeGreaterThanOrEqual(30)
  })

  test("не массив — ошибка про каталог", () => {
    expect(() => parseCatalog({ items: [] })).toThrow(/каталог/)
  })

  test("битая запись называет свой номер и поле", () => {
    const raw = realCatalog()
    const broken = [raw[0], { ...raw[1], kbju: { protein: 1 } }]
    expect(() => parseCatalog(broken)).toThrow(/запись 1.*kbju/)
  })

  test("порция и категория могут быть пустыми", () => {
    const raw = { ...realCatalog()[0], portion: null, category: null, image: null }
    expect(parseCatalog([raw])[0]).toMatchObject({ portion: null, category: null, image: null })
  })
})

describe("loadCatalog", () => {
  test("забирает catalog.json и разбирает его", async () => {
    const raw = realCatalog()
    const fetchFn = (async () => new Response(JSON.stringify(raw), { status: 200 })) as unknown as typeof fetch
    await expect(loadCatalog(fetchFn)).resolves.toHaveLength(raw.length)
  })

  test("404 — подсказка, как собрать каталог", async () => {
    const fetchFn = (async () => new Response("", { status: 404 })) as unknown as typeof fetch
    await expect(loadCatalog(fetchFn)).rejects.toThrow(/build_catalog\.py/)
  })

  test("нет сети — понятное сообщение", async () => {
    const fetchFn = (async () => {
      throw new TypeError("Failed to fetch")
    }) as unknown as typeof fetch
    await expect(loadCatalog(fetchFn)).rejects.toThrow(/каталог/)
  })
})
