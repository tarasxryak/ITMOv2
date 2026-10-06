// DOM игры: рисует состояние из game-logic.js и передаёт ему действия игрока.
(function () {
  "use strict";

  const L = window.LooksmaxLogic;
  const ROUNDS = window.LOOKSMAX_ROUNDS;

  const app = document.getElementById("app");
  const coinsEl = document.getElementById("coins");
  const progressEl = document.getElementById("progress");
  const announcer = document.getElementById("announcer");

  let state = L.createGame(ROUNDS);
  let lastVerdict = "";
  let cart = { status: "idle" };

  // --- помощники -----------------------------------------------------------

  function h(tag, attrs, children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value === false || value === null || value === undefined) continue;
      if (key === "class") el.className = value;
      else if (key === "style") el.style.cssText = value;
      else if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
      else el.setAttribute(key, value === true ? "" : value);
    }
    for (const child of [].concat(children == null ? [] : children)) {
      if (child === null || child === undefined || child === false) continue;
      el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return el;
  }

  function plural(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  }

  const coinsWord = (n) => plural(n, "коин", "коина", "коинов");
  const num = (n, digits) =>
    n.toLocaleString("ru-RU", { minimumFractionDigits: digits || 0, maximumFractionDigits: digits || 1 });
  const rub = (n) => n.toLocaleString("ru-RU") + " ₽";
  const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function announce(text) {
    announcer.textContent = "";
    requestAnimationFrame(() => (announcer.textContent = text));
  }

  function round() {
    return state.rounds[state.index];
  }

  function productById(r, id) {
    return r.products.find((p) => p.id === id);
  }

  // --- шапка ---------------------------------------------------------------

  function renderBar() {
    coinsEl.replaceChildren(
      h("span", { class: "coin", "aria-hidden": "true" }),
      h("span", { class: "coins__value" }, state.coins),
      h("span", { class: "coins__word" }, " " + coinsWord(state.coins)),
    );

    if (L.isFinished(state)) {
      progressEl.hidden = true;
      return;
    }
    progressEl.hidden = false;
    const ticks = state.rounds.map((_, i) => {
      const pick = state.picks[i];
      let cls = "tick";
      if (pick) cls += pick.correct ? " tick--hit" : " tick--miss";
      if (i === state.index) cls += " tick--now";
      return h("li", { class: cls });
    });
    progressEl.replaceChildren(
      h("p", { class: "bar__round" }, `Раунд ${state.index + 1} из ${state.rounds.length}`),
      h("ol", { class: "ticks", "aria-hidden": "true" }, ticks),
    );
  }

  // --- раунд ---------------------------------------------------------------

  function slot(product, i) {
    const r = round();
    const pick = L.currentPick(state);
    const revealed = Boolean(pick);
    const removed = L.removedId(state) === product.id;
    const isWinner = product.id === r.winner_id;
    const isPick = revealed && pick.productId === product.id;

    let cls = "slot";
    if (removed) cls += " slot--removed";
    if (revealed && isWinner) cls += " slot--winner";
    if (isPick && !isWinner) cls += " slot--wrong";

    let tag = null;
    if (removed) tag = "Убран мьюингом";
    else if (isPick) tag = isWinner ? "Твой выбор, мог" : "Твой выбор";
    else if (revealed && isWinner) tag = "Мог по белку";

    const card = h(
      "button",
      {
        class: "card",
        type: "button",
        disabled: revealed || removed,
        "aria-label": removed
          ? `${product.name}, убран мьюингом`
          : `${product.name}, ${rub(product.price)}`,
        onclick: () => onChoose(product.id),
      },
      [
        h("span", { class: "card__photo" }, [
          product.image
            ? h("img", {
                src: product.image,
                alt: "",
                width: 300,
                height: 300,
                loading: i === 0 ? "eager" : "lazy",
                decoding: "async",
                onerror: (e) => e.target.remove(),
              })
            : null,
        ]),
        h("span", { class: "placard" }, [
          h("span", { class: "placard__name" }, product.name),
          h("span", { class: "placard__price" }, rub(product.price)),
        ]),
      ],
    );

    const k = product.kbju;
    return h("li", { class: cls }, [
      h("div", { class: "slot__height" }, [
        revealed
          ? h("div", { class: "slot__bar", style: `--h: ${product.score}; --i: ${i}` }, [
              h("span", { class: "slot__score" }, num(product.score, 3)),
            ])
          : null,
      ]),
      card,
      tag ? h("p", { class: "slot__tag" }, tag) : null,
      revealed
        ? h("dl", { class: "kbju" }, [
            h("div", {}, [h("dt", {}, "Белки"), h("dd", {}, num(k.protein) + " г")]),
            h("div", {}, [h("dt", {}, "Жиры"), h("dd", {}, num(k.fat) + " г")]),
            h("div", {}, [h("dt", {}, "Углеводы"), h("dd", {}, num(k.carbs) + " г")]),
            h("div", {}, [h("dt", {}, "Энергия"), h("dd", {}, num(k.kcal) + " ккал")]),
          ])
        : null,
    ]);
  }

  function scale() {
    const marks = [];
    for (let v = 10; v >= 2; v -= 2) {
      marks.push(h("li", { style: `--v: ${v / 10}` }, num(v / 10, 1)));
    }
    return h("ol", { class: "lineup__scale", "aria-hidden": "true" }, marks);
  }

  function controls() {
    const pick = L.currentPick(state);
    if (pick) {
      return h("div", { class: "controls controls--after" }, [
        h("p", { class: pick.correct ? "verdict verdict--hit" : "verdict verdict--miss" }, lastVerdict),
        h("button", { class: "btn btn--next", type: "button", id: "next", onclick: onNext }, "Дальше"),
      ]);
    }

    let note;
    if (L.removedId(state) !== null) note = "Один неверный вариант убран. Выбирай из двух.";
    else if (state.coins < L.HINT_COST)
      note = `Нужно ${L.HINT_COST} коинов, у тебя ${state.coins}. Коины дают за верные ответы.`;
    else note = "Уберёт один неверный вариант этого раунда.";

    return h("div", { class: "controls" }, [
      h(
        "button",
        {
          class: "btn btn--hint",
          type: "button",
          disabled: !L.canUseHint(state),
          "aria-describedby": "hint-note",
          onclick: onHint,
        },
        `Мьюинг за ${L.HINT_COST} ${coinsWord(L.HINT_COST)}`,
      ),
      h("p", { class: "controls__note", id: "hint-note" }, note),
    ]);
  }

  function renderRound() {
    const r = round();
    app.replaceChildren(
      h("section", { class: "round", "aria-labelledby": "round-title" }, [
        h("div", { class: "round__head" }, [
          h("h1", { class: "round__title", id: "round-title", tabindex: "-1" }, capital(r.query)),
          h("p", { class: "round__ask" }, [
            "Кто здесь могает по белку? Выбери товар, где больше калорий приходится на белок. ",
            h("span", { class: "round__formula" }, "Скор = белки × 4 / ккал, рост на стене."),
          ]),
        ]),
        h("div", { class: "lineup" }, [
          scale(),
          h("ul", { class: "lineup__slots", "aria-label": "Три товара" }, r.products.map(slot)),
        ]),
        controls(),
      ]),
    );
  }

  // --- итог ----------------------------------------------------------------

  function ladder(rank, percent) {
    const rungs = L.RANKS.map((r, i) => {
      const next = L.RANKS[i + 1];
      const range = next ? `${r.from}–${next.from - 1}%` : `${r.from}%`;
      const mine = r.name === rank;
      return h("li", { class: mine ? "rung rung--you" : "rung", "aria-current": mine ? "true" : null }, [
        h("span", { class: "rung__name" }, r.name),
        h("span", { class: "rung__range" }, range),
        mine ? h("span", { class: "rung__you" }, `ты, ${percent}%`) : null,
      ]);
    }).reverse();
    return h("ol", { class: "ladder", "aria-label": "Лестница рангов от true adam до sub3" }, rungs);
  }

  function cartBlock(result) {
    const picks = state.picks.map((pick, i) => {
      const p = productById(state.rounds[i], pick.productId);
      return h("li", { class: pick.correct ? "pick pick--hit" : "pick pick--miss" }, [
        h("span", { class: "pick__mark" }, pick.correct ? "верно" : "мимо"),
        h("span", { class: "pick__name" }, p.name),
        h("span", { class: "pick__price" }, rub(p.price)),
      ]);
    });
    const total = state.picks.reduce(
      (sum, pick, i) => sum + productById(state.rounds[i], pick.productId).price,
      0,
    );

    let status = null;
    if (cart.status === "done") {
      status = h("p", { class: "cart__status cart__status--done" }, [
        "Корзина собрана. ",
        h("a", { href: cart.link, target: "_blank", rel: "noopener" }, "Открыть корзину во ВкусВилле"),
        h("span", { class: "cart__link" }, cart.link),
      ]);
    } else if (cart.status === "error") {
      status = h("p", { class: "cart__status cart__status--error" }, [
        h("strong", {}, "Корзину собрать не получилось. "),
        cart.error.replace(/\.?$/, ". "),
        "Результат игры никуда не делся.",
      ]);
    }

    return h("section", { class: "cart", "aria-labelledby": "cart-title" }, [
      h("h2", { id: "cart-title" }, "Твоя корзина"),
      h("p", { class: "cart__lead" }, `Твои выборы за ${result.total} раундов, по одной штуке каждого.`),
      h("ol", { class: "picks" }, picks),
      h("p", { class: "cart__total" }, ["Итого ", h("strong", {}, rub(total))]),
      cart.status === "done"
        ? null
        : h(
            "button",
            {
              class: "btn btn--cart",
              type: "button",
              id: "cart-button",
              disabled: cart.status === "loading",
              onclick: () => onCart(result.xmlIds),
            },
            cart.status === "loading" ? "Собираем корзину…" : "Собрать корзину во ВкусВилле",
          ),
      h("div", { class: "cart__live", "aria-live": "polite" }, status),
    ]);
  }

  function renderResult() {
    const result = L.summary(state);
    app.replaceChildren(
      h("section", { class: "result", "aria-labelledby": "result-title" }, [
        h("div", { class: "result__head" }, [
          h("p", { class: "result__lead" }, "Твой ранг"),
          h("h1", { class: "result__rank", id: "result-title", tabindex: "-1" }, result.rank),
          h("p", { class: "result__stats" }, [
            h("strong", {}, `${result.percent}%`),
            ` верных: ${result.correct} из ${result.total}. На счету ${result.coins} ${coinsWord(result.coins)}.`,
          ]),
          h("button", { class: "btn btn--ghost", type: "button", onclick: onRestart }, "Сыграть ещё раз"),
        ]),
        ladder(result.rank, result.percent),
        cartBlock(result),
      ]),
    );
  }

  function render() {
    renderBar();
    if (L.isFinished(state)) renderResult();
    else renderRound();
  }

  // --- действия ------------------------------------------------------------

  function onChoose(id) {
    const before = state.coins;
    state = L.choose(state, id);
    const r = state.rounds[state.index];
    const pick = L.currentPick(state);
    const gain = state.coins - before;
    const winner = productById(r, r.winner_id);
    if (pick.correct) {
      lastVerdict = state.streak >= 3
        ? `Мог. Серия ${state.streak} подряд: +${gain} ${coinsWord(gain)}.`
        : `Мог. Лучший скор раунда: +${gain} ${coinsWord(gain)}.`;
    } else {
      lastVerdict = `Мимо. Лучший скор у «${winner.name}»: ${num(winner.score, 3)}.`;
    }
    render();
    announce(lastVerdict);
    document.getElementById("next").focus();
  }

  function onHint() {
    state = L.useHint(state);
    const removed = productById(round(), L.removedId(state));
    render();
    announce(`Мьюинг убрал «${removed.name}». Осталось ${state.coins} ${coinsWord(state.coins)}.`);
    app.querySelector(".card:not(:disabled)").focus();
  }

  function onNext() {
    state = L.nextRound(state);
    render();
    const title = document.getElementById(L.isFinished(state) ? "result-title" : "round-title");
    title.focus();
    window.scrollTo({ top: 0 });
  }

  async function onCart(xmlIds) {
    cart = { status: "loading" };
    render();
    try {
      const link = await L.requestCartLink(xmlIds, window.fetch.bind(window));
      cart = { status: "done", link: link };
    } catch (e) {
      cart = { status: "error", error: e.message };
    }
    render();
    const focusTarget = cart.status === "done"
      ? app.querySelector(".cart__status a")
      : document.getElementById("cart-button");
    focusTarget.focus();
  }

  function onRestart() {
    state = L.createGame(ROUNDS);
    cart = { status: "idle" };
    render();
    document.getElementById("round-title").focus();
  }

  if (!Array.isArray(ROUNDS) || ROUNDS.length === 0) {
    app.replaceChildren(
      h("p", { class: "note" }, "Нет раундов: собери их командой python scripts/build_rounds.py."),
    );
    return;
  }
  render();
})();
