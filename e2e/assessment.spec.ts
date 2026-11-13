import { expect, test, type Page } from "@playwright/test";
import { CORE_ITEMS } from "../src/assessment/items";

// Проходит вопросы по очереди: Likert — кнопка с цифрой value, выбор — вариант с индексом.
async function answerQuestions(page: Page, count: number, pick: (id: string) => number) {
  for (let i = 0; i < count; i++) {
    const item = CORE_ITEMS[i];
    const group = page.getByRole("group").first();
    const buttons = group.getByRole("button");
    const v = pick(item.id);
    const isChoice = item.block === "situation" || item.block === "challenge";
    await buttons.nth(isChoice ? v : v - 1).click();
    // ждём следующего вопроса (счётчик в шапке)
    if (i < CORE_ITEMS.length - 1) await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", String(i + 1));
  }
}

test("полная диагностика: прохождение, сохранение, результат с объяснениями и честным предупреждением", async ({ page }) => {
  await page.goto("/assessment");
  const idToItem = new Map(CORE_ITEMS.map((i) => [i.id, i]));
  // Профиль «исследователь»: нравится I и R, остальное — нет; задания решаем верно
  await answerQuestions(page, CORE_ITEMS.length, (id) => {
    const it = idToItem.get(id)!;
    if (it.block === "interest") return "letter" in it && ["I", "R"].includes((it as { letter: string }).letter) ? 5 : 1;
    if (it.block === "challenge") return (it as { correct: number }).correct;
    if (it.block === "situation") return 0;
    return 4;
  });
  await expect(page).toHaveURL(/\/assessment\/result/, { timeout: 20_000 });
  await expect(page.getByRole("note")).toContainText("валидацию");
  await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Попробовать профессию" })).toHaveCount(5);

  // Объяснимость: у первой профессии есть «Почему рекомендуем» и «Понадобятся навыки»
  const first = page.getByRole("listitem").filter({ has: page.getByRole("heading", { level: 2 }) }).first();
  await expect(first).toContainText("Почему рекомендуем");
  await expect(first).toContainText("Понадобятся навыки");

  // Детерминированность: после перезагрузки порядок тот же
  const titles = async () => page.getByRole("heading", { level: 2 }).allTextContents();
  const before = await titles();
  await page.reload();
  expect(await titles()).toEqual(before);

  // «Попробовать профессию» ведёт в карточку профессии
  const href = await page.getByRole("link", { name: "Попробовать профессию" }).first().getAttribute("href");
  expect(href).toMatch(/^\/professions\//);
});

test("ответы сохраняются на сервере: после перезагрузки диагностика продолжается с нужного вопроса", async ({ page }) => {
  await page.goto("/assessment");
  await answerQuestions(page, 4, () => 5);
  await page.reload();
  await expect(page.getByRole("status")).toContainText("5"); // «Вы остановились на вопросе 5»
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "4");
  const state = await (await page.request.get("/api/assessment")).json();
  expect(Object.keys(state.answers)).toHaveLength(4);
});

test("слишком мало ответов: честный отказ вместо выдуманного результата", async ({ page, request }) => {
  await page.goto("/assessment");
  await answerQuestions(page, 3, () => 3);
  const res = await page.request.post("/api/assessment", { data: { action: "complete" } });
  expect(res.status()).toBe(422);
  expect((await res.json()).error).toContain("12");
  void request;
});

test("API: сервер отклоняет неверные ответы и считает результат сам", async ({ request }) => {
  expect((await request.post("/api/assessment/answer", { data: { id: "i-R1", value: 9 } })).status()).toBe(400);
  expect((await request.post("/api/assessment/answer", { data: { id: "нет-такого", value: 3 } })).status()).toBe(400);
  expect((await request.post("/api/assessment/answer", { data: { id: "i-R1", value: 3, extra: 1 } })).status()).toBe(400);
  expect((await request.post("/api/assessment", { data: { action: "hack", result: { top: [] } } })).status()).toBe(400);
  expect((await request.post("/api/assessment", { data: { action: "complete", result: { top: ["fake"] } } })).status()).toBe(404);
});

test("чужие данные недоступны: новый браузер не видит ответы другого", async ({ browser }) => {
  const a = await browser.newContext();
  const b = await browser.newContext();
  const ra = await a.request.post("/api/assessment/answer", { data: { id: "i-R1", value: 5 }, headers: { "content-type": "application/json" } });
  expect(ra.status()).toBe(200);
  const sa = await (await a.request.get("/api/assessment")).json();
  const sb = await (await b.request.get("/api/assessment")).json();
  expect(sa.answers).toEqual({ "i-R1": 5 });
  expect(sb.exists).toBe(false);
  await a.close(); await b.close();
});

test("на 320px диагностика и результат без горизонтальной прокрутки, кнопки не ниже 44px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/assessment");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  for (const b of await page.getByRole("group").first().getByRole("button").all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});
