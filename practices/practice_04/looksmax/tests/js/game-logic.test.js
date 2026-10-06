// Логика игры (web/game-logic.js) на реальных раундах из web/rounds.js.
const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const logic = require("../../web/game-logic.js");

const ROOT = path.join(__dirname, "..", "..");

function loadRounds() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "web", "rounds.js"), "utf8"), sandbox);
  return sandbox.window.LOOKSMAX_ROUNDS;
}

const ROUNDS = loadRounds();
// Раунд «творог»: победитель 69259, неверные 27695 и 185.
// Раунд «курица»: победитель 488, неверные 484 и 19419.
const WINNERS = [69259, 488, 107130, 43782, 29566, 68855, 81955, 102608, 108493, 100471];
const LOSERS = [27695, 484, 16589, 43778, 16026, 95607, 65291, 23101, 108494, 30799];

// Проходит раунды по очереди: true — верный выбор, false — неверный.
function play(answers) {
  let state = logic.createGame(ROUNDS);
  answers.forEach((correct, i) => {
    if (i > 0) state = logic.nextRound(state);
    state = logic.choose(state, correct ? WINNERS[i] : LOSERS[i]);
  });
  return state;
}

describe("лукс-коины", () => {
  test("игра стартует с нулём коинов", () => {
    assert.equal(logic.createGame(ROUNDS).coins, 0);
  });

  test("верный выбор даёт +10", () => {
    assert.equal(play([true]).coins, 10);
  });

  test("неверный выбор не даёт коинов", () => {
    assert.equal(play([false]).coins, 0);
  });

  test("третий верный подряд даёт ещё +5", () => {
    assert.equal(play([true, true, true]).coins, 35);
  });

  test("каждый следующий верный в серии тоже даёт +5", () => {
    assert.equal(play([true, true, true, true]).coins, 50);
  });

  test("ошибка обнуляет серию", () => {
    assert.equal(play([true, true, false, true, true]).coins, 40);
  });
});

describe("ранг", () => {
  const cases = [
    [0, "sub3"], [19, "sub3"],
    [20, "sub5"], [39, "sub5"],
    [40, "LTN"], [49, "LTN"],
    [50, "MTN"], [59, "MTN"],
    [60, "HTN"], [69, "HTN"],
    [70, "chadlite"], [79, "chadlite"],
    [80, "chad"], [99, "chad"],
    [100, "true adam"],
  ];
  for (const [percent, rank] of cases) {
    test(`${percent}% → ${rank}`, () => {
      assert.equal(logic.rankFor(percent), rank);
    });
  }

  test("лестница идёт от sub3 до true adam", () => {
    assert.deepEqual(
      logic.RANKS.map((r) => r.name),
      ["sub3", "sub5", "LTN", "MTN", "HTN", "chadlite", "chad", "true adam"],
    );
  });
});

describe("ход игры", () => {
  test("после выбора раунд считается отвеченным", () => {
    const state = play([true]);
    assert.equal(logic.currentPick(state).productId, 69259);
    assert.equal(logic.currentPick(state).correct, true);
  });

  test("до выбора у раунда нет ответа", () => {
    assert.equal(logic.currentPick(logic.createGame(ROUNDS)), null);
  });

  test("второй выбор в том же раунде запрещён", () => {
    const state = play([false]);
    assert.throws(() => logic.choose(state, 69259), /уже/);
  });

  test("нельзя выбрать товар не из текущего раунда", () => {
    assert.throws(() => logic.choose(logic.createGame(ROUNDS), 488), /раунд/);
  });

  test("нельзя перейти дальше, не выбрав товар", () => {
    assert.throws(() => logic.nextRound(logic.createGame(ROUNDS)), /выбери/);
  });

  test("игра заканчивается после десятого раунда", () => {
    const nine = play(Array(9).fill(true));
    assert.equal(logic.isFinished(logic.nextRound(nine)), false);
    const ten = logic.choose(logic.nextRound(nine), WINNERS[9]);
    assert.equal(logic.isFinished(logic.nextRound(ten)), true);
  });
});

describe("подсказка «мьюинг»", () => {
  // После двух верных: 20 коинов, текущий раунд «рыба» (16589, 107130 — победитель, 66659).
  const fishRound = () => logic.nextRound(play([true, true]));
  const first = () => 0;
  const last = () => 0.99;

  test("убирает неверный вариант, выбранный случайно", () => {
    assert.equal(logic.removedId(logic.useHint(fishRound(), first)), 16589);
    assert.equal(logic.removedId(logic.useHint(fishRound(), last)), 66659);
  });

  test("стоит 15 коинов", () => {
    assert.equal(logic.useHint(fishRound(), first).coins, 5);
  });

  test("до подсказки в раунде ничего не убрано", () => {
    assert.equal(logic.removedId(fishRound()), null);
  });

  test("недоступна, если коинов меньше 15", () => {
    const state = logic.nextRound(play([true])); // 10 коинов
    assert.equal(logic.canUseHint(state), false);
    assert.throws(() => logic.useHint(state, first), /15/);
  });

  test("при балансе ровно 15 доступна и оставляет 0", () => {
    // 30 коинов → подсказка → 15, неверный выбор → следующая подсказка → 0.
    let state = logic.nextRound(play([true, false, true, false, true]));
    state = logic.useHint(state, last); // колбаса: убран 75753
    assert.equal(state.coins, 15);
    state = logic.nextRound(logic.choose(state, 95607));
    assert.equal(logic.canUseHint(state), true);
    state = logic.useHint(state, first);
    assert.equal(state.coins, 0);
    assert.equal(logic.canUseHint(state), false);
  });

  test("один раз за раунд", () => {
    const state = logic.useHint(logic.nextRound(play([true, true, true])), first);
    assert.equal(state.coins, 20);
    assert.equal(logic.canUseHint(state), false);
    assert.throws(() => logic.useHint(state, first), /уже/);
  });

  test("недоступна после выбора", () => {
    const state = play([true, true]);
    assert.equal(logic.canUseHint(state), false);
  });

  test("убранный товар нельзя выбрать", () => {
    const state = logic.useHint(fishRound(), first);
    assert.throws(() => logic.choose(state, 16589), /убран/);
  });

  test("не трогает исходное состояние", () => {
    const before = fishRound();
    logic.useHint(before, first);
    assert.equal(before.coins, 20);
    assert.equal(logic.removedId(before), null);
  });
});

describe("корзина ВкусВилла", () => {
  const fixture = (name) => fs.readFileSync(path.join(ROOT, "tests", "fixtures", name), "utf8");
  // Конверт как в реальном ответе https://mcp.vkusvill.ru/mcp на tools/call.
  const rpcResult = (text, isError = false) =>
    JSON.stringify({ jsonrpc: "2.0", id: 1, result: { content: [{ type: "text", text }], isError } });
  const LINK = "https://vkusvill.ru/?share_basket=2276979561";

  function fakeFetch(respond) {
    const calls = [];
    const fetch = async (url, init) => {
      calls.push({ url, init });
      return respond();
    };
    return { fetch, calls };
  }
  const answer = (status, body) => () => ({ ok: status < 400, status, text: async () => body });

  test("запрос — tools/call vkusvill_cart_link_create, по 1 шт. каждого товара", () => {
    assert.deepEqual(logic.cartRequest([27695, 81955]), {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "vkusvill_cart_link_create",
        arguments: { products: [{ xml_id: 27695, q: 1 }, { xml_id: 81955, q: 1 }] },
      },
    });
  });

  test("пустая корзина — ошибка", () => {
    assert.throws(() => logic.cartRequest([]), /пуст/);
  });

  test("достаёт ссылку из ответа", () => {
    assert.equal(logic.parseCartLink(rpcResult(fixture("cart_link_27695.json"))), LINK);
  });

  test("достаёт ссылку из ответа в формате event-stream", () => {
    const sse = "event: message\ndata: " + rpcResult(fixture("cart_link_27695.json")) + "\n\n";
    assert.equal(logic.parseCartLink(sse), LINK);
  });

  test("ok: false — ошибка с текстом ВкусВилла", () => {
    assert.throws(
      () => logic.parseCartLink(rpcResult(fixture("details_999999999.json"))),
      /Некорректный id товара/,
    );
  });

  test("ошибка JSON-RPC — понятная ошибка", () => {
    assert.throws(
      () => logic.parseCartLink(fixture("rpc_error_details_id_0.json")),
      /ВкусВилл не принял запрос/,
    );
  });

  test("isError в результате — ошибка", () => {
    assert.throws(() => logic.parseCartLink(rpcResult("Internal error", true)), /Internal error/);
  });

  test("не JSON — понятная ошибка", () => {
    assert.throws(() => logic.parseCartLink("<html>502</html>"), /непонятный ответ/);
  });

  test("JSON без result и без ссылки — понятная ошибка", () => {
    assert.throws(() => logic.parseCartLink('{"jsonrpc":"2.0","id":1}'), /непонятный ответ/);
    assert.throws(
      () => logic.parseCartLink(rpcResult('{"ok":true,"data":{}}')),
      /непонятный ответ/,
    );
  });

  test("отправляет POST с нужными заголовками", async () => {
    const { fetch, calls } = fakeFetch(answer(200, rpcResult(fixture("cart_link_27695.json"))));
    assert.equal(await logic.requestCartLink([27695], fetch), LINK);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://mcp.vkusvill.ru/mcp");
    assert.equal(calls[0].init.method, "POST");
    assert.deepEqual(calls[0].init.headers, {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    });
    assert.deepEqual(JSON.parse(calls[0].init.body), logic.cartRequest([27695]));
  });

  test("сеть недоступна — понятная ошибка", async () => {
    const fetch = async () => {
      throw new TypeError("Failed to fetch");
    };
    await assert.rejects(logic.requestCartLink([27695], fetch), /связаться с ВкусВиллом/);
  });

  test("HTTP-ошибка — понятная ошибка с кодом", async () => {
    const { fetch } = fakeFetch(answer(503, "Service Unavailable"));
    await assert.rejects(logic.requestCartLink([27695], fetch), /503/);
  });
});

describe("итог", () => {
  function finish(answers) {
    return logic.summary(logic.nextRound(play(answers)));
  }

  test("7 верных из 10 — 70% и chadlite", () => {
    const result = finish([true, true, true, false, true, true, false, true, false, true]);
    assert.equal(result.correct, 7);
    assert.equal(result.percent, 70);
    assert.equal(result.rank, "chadlite");
  });

  test("все верные — 100% и true adam", () => {
    const result = finish(Array(10).fill(true));
    assert.equal(result.percent, 100);
    assert.equal(result.rank, "true adam");
    assert.equal(result.coins, 20 + 8 * 15);
  });

  test("в итоге xml_id выбранных товаров по порядку раундов", () => {
    const result = finish([true, false, true, false, true, false, true, false, true, false]);
    assert.deepEqual(
      result.xmlIds,
      [69259, 484, 107130, 43778, 29566, 95607, 81955, 23101, 108493, 30799],
    );
  });
});
