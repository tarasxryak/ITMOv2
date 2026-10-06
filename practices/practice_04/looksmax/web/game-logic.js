// Чистая логика Looksmax Grocery: коины, ранг, подсказка, состояние игры.
// В браузере — window.LooksmaxLogic, в node — module.exports.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.LooksmaxLogic = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const COINS_CORRECT = 10;
  const COINS_STREAK_BONUS = 5;
  const STREAK_FROM = 3;
  const HINT_COST = 15;

  function coinsForCorrect(streak) {
    return COINS_CORRECT + (streak >= STREAK_FROM ? COINS_STREAK_BONUS : 0);
  }

  // Лестница рангов снизу вверх: from — минимальный процент для ранга.
  const RANKS = [
    { name: "sub3", from: 0 },
    { name: "sub5", from: 20 },
    { name: "LTN", from: 40 },
    { name: "MTN", from: 50 },
    { name: "HTN", from: 60 },
    { name: "chadlite", from: 70 },
    { name: "chad", from: 80 },
    { name: "true adam", from: 100 },
  ];

  function rankFor(percent) {
    let rank = RANKS[0].name;
    for (const r of RANKS) {
      if (percent >= r.from) rank = r.name;
    }
    return rank;
  }

  function createGame(rounds) {
    return {
      rounds: rounds,
      index: 0,
      coins: 0,
      streak: 0,
      correct: 0,
      picks: [],
      removed: [],
    };
  }

  function currentPick(state) {
    return state.picks[state.index] || null;
  }

  function isFinished(state) {
    return state.index >= state.rounds.length;
  }

  function choose(state, productId) {
    const round = state.rounds[state.index];
    if (currentPick(state)) {
      throw new Error("в этом раунде товар уже выбран: нажми «Дальше»");
    }
    if (!round.products.some((p) => p.id === productId)) {
      throw new Error(`товара ${productId} нет в текущем раунде`);
    }
    if (removedId(state) === productId) {
      throw new Error("этот товар убран мьюингом, выбери из оставшихся");
    }
    const isCorrect = productId === round.winner_id;
    const streak = isCorrect ? state.streak + 1 : 0;
    return Object.assign({}, state, {
      coins: state.coins + (isCorrect ? coinsForCorrect(streak) : 0),
      streak: streak,
      correct: state.correct + (isCorrect ? 1 : 0),
      picks: state.picks.concat([{ productId: productId, correct: isCorrect }]),
    });
  }

  function removedId(state) {
    const id = state.removed[state.index];
    return id === undefined ? null : id;
  }

  function canUseHint(state) {
    return !isFinished(state) && !currentPick(state) &&
      removedId(state) === null && state.coins >= HINT_COST;
  }

  // Мьюинг: за 15 коинов убирает один случайный неверный вариант раунда.
  function useHint(state, random) {
    if (removedId(state) !== null) {
      throw new Error("мьюинг в этом раунде уже использован");
    }
    if (currentPick(state)) {
      throw new Error("товар уже выбран: мьюинг работает только до выбора");
    }
    if (state.coins < HINT_COST) {
      throw new Error(`для мьюинга нужно ${HINT_COST} коинов, а у тебя ${state.coins}`);
    }
    const round = state.rounds[state.index];
    const wrong = round.products.filter((p) => p.id !== round.winner_id);
    const pick = wrong[Math.floor((random || Math.random)() * wrong.length)];
    const removed = state.removed.slice();
    removed[state.index] = pick.id;
    return Object.assign({}, state, { coins: state.coins - HINT_COST, removed: removed });
  }

  function nextRound(state) {
    if (!currentPick(state)) {
      throw new Error("сначала выбери товар в этом раунде");
    }
    return Object.assign({}, state, { index: state.index + 1 });
  }

  function summary(state) {
    const percent = Math.round((state.correct / state.rounds.length) * 100);
    return {
      correct: state.correct,
      total: state.rounds.length,
      percent: percent,
      rank: rankFor(percent),
      coins: state.coins,
      xmlIds: state.picks.map((pick, i) => {
        return state.rounds[i].products.find((p) => p.id === pick.productId).xml_id;
      }),
    };
  }

  const CART_URL = "https://mcp.vkusvill.ru/mcp";

  function cartRequest(xmlIds) {
    if (!xmlIds.length) {
      throw new Error("корзина пуста: сыграй хотя бы один раунд");
    }
    return {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "vkusvill_cart_link_create",
        arguments: { products: xmlIds.map((id) => ({ xml_id: id, q: 1 })) },
      },
    };
  }

  const UNCLEAR_ANSWER = "ВкусВилл прислал непонятный ответ, попробуй ещё раз";

  // Ответ MCP приходит либо JSON, либо event-stream со строкой «data: {...}».
  function parseRpc(text) {
    const trimmed = text.trim();
    const dataLine = trimmed.split("\n").find((line) => line.startsWith("data:"));
    const json = dataLine ? dataLine.slice("data:".length) : trimmed;
    try {
      return JSON.parse(json);
    } catch (e) {
      throw new Error(UNCLEAR_ANSWER);
    }
  }

  function parseCartLink(text) {
    const response = parseRpc(text);
    if (response.error) {
      throw new Error(`ВкусВилл не принял запрос: ${response.error.message}`);
    }
    const result = response.result;
    if (!result || !Array.isArray(result.content)) {
      throw new Error(UNCLEAR_ANSWER);
    }
    const body = result.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");
    if (result.isError) {
      throw new Error(`ВкусВилл вернул ошибку: ${body}`);
    }
    const data = parseRpc(body);
    if (!data.ok) {
      throw new Error(`ВкусВилл вернул ошибку: ${data.error.message}`);
    }
    if (!data.data || !data.data.link) {
      throw new Error(UNCLEAR_ANSWER);
    }
    return data.data.link;
  }

  async function requestCartLink(xmlIds, fetchFn) {
    const body = JSON.stringify(cartRequest(xmlIds));
    let response;
    try {
      response = await fetchFn(CART_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: body,
      });
    } catch (e) {
      throw new Error("Не получилось связаться с ВкусВиллом. Проверь интернет и попробуй ещё раз.");
    }
    if (!response.ok) {
      throw new Error(`ВкусВилл ответил ошибкой ${response.status}. Попробуй ещё раз через минуту.`);
    }
    return parseCartLink(await response.text());
  }

  return {
    cartRequest: cartRequest,
    parseCartLink: parseCartLink,
    requestCartLink: requestCartLink,
    HINT_COST: HINT_COST,
    RANKS: RANKS,
    rankFor: rankFor,
    createGame: createGame,
    currentPick: currentPick,
    isFinished: isFinished,
    choose: choose,
    removedId: removedId,
    canUseHint: canUseHint,
    useHint: useHint,
    nextRound: nextRound,
    summary: summary,
  };
});
