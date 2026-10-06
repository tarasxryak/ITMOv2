// Скриншот игры в headless Chrome с действиями перед снимком.
// Запуск: node tools/screenshot.mjs ВЫХОД.png ШИРИНА ВЫСОТА [JS-шаг ...]
// Каждый JS-шаг выполняется на странице по очереди, между шагами пауза 400 мс.
// Игра раздаётся с http://127.0.0.1:8765 (.venv/bin/python serve.py после npm run build в web/).
// Адрес можно сменить через LOOKSMAX_URL, например http://127.0.0.1:8765/?seed=7 для воспроизводимых раундов.
// Браузер: CHROME_PATH, иначе первый найденный Chrome/Chromium (macOS, Linux, Playwright).
// Страница снимается целиком, по полной высоте документа.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function findChrome() {
  const playwright = process.env.PLAYWRIGHT_BROWSERS_PATH;
  const bundled = playwright && existsSync(playwright)
    ? readdirSync(playwright).filter((d) => d.startsWith("chromium-")).map((d) => join(playwright, d, "chrome-linux", "chrome"))
    : [];
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ...bundled,
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  ];
  const found = candidates.find((path) => path && existsSync(path));
  if (!found) throw new Error("Chrome не найден: укажи путь в CHROME_PATH");
  return found;
}
const CHROME = findChrome();
// В контейнере Chrome запускается от root и без --no-sandbox не стартует.
const SANDBOX_FLAGS = process.getuid?.() === 0 ? ["--no-sandbox"] : [];
const URL = process.env.LOOKSMAX_URL || "http://127.0.0.1:8765/";
const [out, width = "1280", height = "900", ...steps] = process.argv.slice(2);
if (!out) {
  console.error("нужен путь для png: node tools/screenshot.mjs out.png 1280 900 [js ...]");
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", ...SANDBOX_FLAGS,
  `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "lm-chrome-"))}`,
  `--window-size=${width},${height}`, "about:blank",
], { stdio: "ignore" });

try {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(100);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      target = list.find((t) => t.type === "page");
    } catch {}
  }
  if (!target) throw new Error("Chrome не поднял DevTools");

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  };
  const send = (method, params = {}) => new Promise((r) => {
    const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params }));
  });

  await send("Emulation.setDeviceMetricsOverride", {
    width: +width, height: +height, deviceScaleFactor: 1, mobile: +width < 600,
  });
  await send("Page.navigate", { url: URL });
  await sleep(2500);
  for (const step of steps) {
    const res = await send("Runtime.evaluate", { expression: step, awaitPromise: true, returnByValue: true });
    if (res.result?.exceptionDetails) console.error("шаг упал:", step, res.result.exceptionDetails.exception?.description);
    await sleep(400);
  }
  await sleep(1200);
  const { result: m } = await send("Runtime.evaluate", {
    expression: "JSON.stringify({w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight})",
    returnByValue: true,
  });
  const size = JSON.parse(m.result.value);
  if (size.w > +width) console.log(`ВНИМАНИЕ: горизонтальная прокрутка, ширина документа ${size.w} > ${width}`);
  const shot = await send("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: +width, height: Math.max(size.h, +height), scale: 1 },
  });
  writeFileSync(out, Buffer.from(shot.result.data, "base64"));
  console.log("сохранено:", out, `(${width}×${Math.max(size.h, +height)})`);
  ws.close();
} finally {
  chrome.kill();
}
