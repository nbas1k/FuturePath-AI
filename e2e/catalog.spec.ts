import { expect, test } from "@playwright/test";

test("каталог: 100+ профессий, фильтр по направлению и поиск", async ({ page }) => {
  await page.goto("/professions");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Каталог профессий");
  const all = await page.locator("ul.grid > li").count();
  expect(all).toBeGreaterThanOrEqual(100);
  await page.getByRole("button", { name: "Медицина", exact: true }).click();
  const med = await page.locator("ul.grid > li").count();
  expect(med).toBeGreaterThanOrEqual(6);
  expect(med).toBeLessThan(all);
  await page.getByRole("button", { name: "Все", exact: true }).click();
  await page.getByRole("searchbox").fill("архитектор");
  await expect(page.locator("ul.grid > li").first()).toContainText("Архитектор");
  await page.getByRole("searchbox").fill("zzzzzz");
  await expect(page.getByRole("status")).toContainText("Ничего не найдено");
});

test("карточка профессии: разделы, вводное задание проверяется на сервере, результат сохраняется", async ({ page }) => {
  await page.goto("/professions/doctor");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Врач");
  for (const h of ["Основные задачи", "Профессиональные компетенции", "Универсальные навыки", "Что нужно знать для старта", "Примеры реальных задач", "Путь обучения"]) {
    await expect(page.getByRole("heading", { name: h })).toBeVisible();
  }
  await expect(page.getByText("учебный черновик").first()).toBeVisible();
  // Выбираем «неверный» вариант: заведомо неверно — вариант с текстом «Сразу назначить лекарство»
  await page.getByRole("button", { name: "Сразу назначить лекарство" }).click();
  await page.getByRole("button", { name: "Проверить" }).click();
  await expect(page.getByRole("status")).toContainText("Не совсем");
  await page.getByRole("button", { name: "Попробовать ещё раз" }).click();
  await page.getByRole("button", { name: "Выслушать жалобы и собрать анамнез" }).click();
  await page.getByRole("button", { name: "Проверить" }).click();
  await expect(page.getByRole("status")).toContainText("Верно");
  await page.reload();
  await expect(page.getByText("Вы уже решили это задание")).toBeVisible();
});

test("английский интерфейс: названия профессий и разделы на английском", async ({ page }) => {
  await page.request.post("/api/onboarding", { data: { lang: "en" } });
  await page.goto("/professions/software-developer");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Software developer");
  await expect(page.getByRole("heading", { name: "Main tasks" })).toBeVisible();
  await expect(page.getByText("Descriptions are currently available in Russian only.").first()).toBeVisible();
});

test("API вводного задания отклоняет неверные данные", async ({ request }) => {
  expect((await request.post("/api/careers/challenge", { data: { careerId: "doctor", choice: 9 } })).status()).toBe(400);
  expect((await request.post("/api/careers/challenge", { data: { careerId: "нет", choice: 0 } })).status()).toBe(400);
  expect((await request.post("/api/careers/challenge", { data: { careerId: "doctor", choice: 0, correct: true } })).status()).toBe(400);
});

test("все профессии открываются без ошибок", async ({ request }) => {
  const html = await (await request.get("/professions")).text();
  const ids = Array.from(new Set(Array.from(html.matchAll(/href="\/professions\/([a-z0-9-]+)"/g)).map((m) => m[1]))).filter((x) => x !== "switch");
  expect(ids.length).toBeGreaterThanOrEqual(100);
  for (const id of ids) expect((await request.get(`/professions/${id}`)).status(), id).toBe(200);
});