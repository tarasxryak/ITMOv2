import { describe, expect, test } from "vitest"
import { requestCartLink } from "./cart"

const LINK = "https://vkusvill.ru/?share_basket=2276979561"

function fakeFetch(respond: () => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetchFn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    return respond()
  }) as unknown as typeof fetch
  return { fetchFn, calls }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

describe("requestCartLink", () => {
  test("шлёт POST /api/cart с xml_ids и возвращает ссылку", async () => {
    const { fetchFn, calls } = fakeFetch(() => json({ link: LINK }))
    await expect(requestCartLink([27695, 81955], fetchFn)).resolves.toBe(LINK)
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe("/api/cart")
    expect(calls[0].init.method).toBe("POST")
    expect(new Headers(calls[0].init.headers).get("Content-Type")).toBe("application/json")
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ xml_ids: [27695, 81955] })
  })

  test("пустая корзина — ошибка без запроса", async () => {
    const { fetchFn, calls } = fakeFetch(() => json({ link: LINK }))
    await expect(requestCartLink([], fetchFn)).rejects.toThrow(/корзина пуста/)
    expect(calls).toHaveLength(0)
  })

  test("ошибка ВкусВилла доходит до игрока его текстом", async () => {
    const { fetchFn } = fakeFetch(() => json({ error: "ВкусВилл вернул ошибку: товар недоступен" }, 502))
    await expect(requestCartLink([1], fetchFn)).rejects.toThrow("товар недоступен")
  })

  test("сервер игры недоступен — понятное сообщение, а не техническая ошибка", async () => {
    const { fetchFn } = fakeFetch(() => {
      throw new TypeError("Failed to fetch")
    })
    await expect(requestCartLink([1], fetchFn)).rejects.toThrow(/сервер игры.*serve\.py/i)
  })

  test("ответ не JSON — непонятный ответ, с кодом статуса", async () => {
    const { fetchFn } = fakeFetch(() => new Response("<html>Bad gateway</html>", { status: 502 }))
    await expect(requestCartLink([1], fetchFn)).rejects.toThrow(/502/)
  })

  test("успех без ссылки — непонятный ответ", async () => {
    const { fetchFn } = fakeFetch(() => json({}))
    await expect(requestCartLink([1], fetchFn)).rejects.toThrow(/непонятный ответ/)
  })
})
