// Корзина ВкусВилла. Браузер не может звать mcp.vkusvill.ru напрямую (CORS), поэтому идём через serve.py.
const UNCLEAR_ANSWER = "ВкусВилл прислал непонятный ответ, попробуй ещё раз"

export async function requestCartLink(
  xmlIds: readonly number[],
  fetchFn: typeof fetch = (input, init) => fetch(input, init),
): Promise<string> {
  if (!xmlIds.length) throw new Error("корзина пуста: сыграй хотя бы один раунд")
  let response: Response
  try {
    response = await fetchFn("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ xml_ids: xmlIds }),
    })
  } catch {
    throw new Error("Сервер игры не отвечает. Запусти serve.py и попробуй ещё раз.")
  }
  let body: { link?: unknown; error?: unknown } | null = null
  try {
    body = await response.json()
  } catch {
    body = null
  }
  if (!response.ok) {
    throw new Error(
      typeof body?.error === "string" ? body.error : `Сервер игры ответил ошибкой ${response.status}. Попробуй ещё раз через минуту.`,
    )
  }
  if (typeof body?.link !== "string") throw new Error(UNCLEAR_ANSWER)
  return body.link
}
