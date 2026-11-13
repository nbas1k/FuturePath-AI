import { expect, test } from "@playwright/test";

test("новый пользователь проходит онбординг, данные сохраняются, интерфейс переключается на английский", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Настроить маршрут" }).click();
  await expect(page).toHaveURL(/\/onboarding/);

  // 0: приветствие (без навигации — один экран, одна задача)
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await page.getByRole("button", { name: "Начать" }).click();

  // 1: язык — переключаем на английский, интерфейс меняется сразу
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // 2: возраст и образование
  await page.getByRole("button", { name: "14–17" }).click();
  await expect(page.getByRole("note")).toContainText("under 18");
  await page.getByRole("button", { name: "School" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // 3: цель
  await page.getByRole("button", { name: /Everything together/ }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // 4: интересы — не больше 4
  for (const n of ["Medicine", "IT and artificial intelligence", "Law and public administration", "Business and finance"]) {
    await page.getByRole("button", { name: n }).click();
  }
  await expect(page.getByRole("button", { name: "Science and research" })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Science and research" }).click(); // пятый не выбирается
  await expect(page.getByRole("button", { name: "Science and research" })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // 5: диагностика — завершаем онбординг, уходим в каталог
  await page.getByRole("button", { name: "I'll choose a career myself for now" }).click();
  await expect(page).toHaveURL(/\/professions/);

  // Сохранилось на сервере
  const state = await (await page.request.get("/api/onboarding")).json();
  expect(state).toMatchObject({ done: true, lang: "en", ageGroup: "14_17", education: "school", goal: "all" });
  expect(state.interests).toEqual(["med", "it", "law", "biz"]);

  // Главная после онбординга: на английском, есть цель дня, XP и серия
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Good to see you!" })).toBeVisible();
  await expect(page.getByText("Day streak")).toBeVisible();
  await page.reload(); // сохраняется после перезагрузки
  await expect(page.getByRole("heading", { name: "Good to see you!" })).toBeVisible();
});

test("навигация: ровно 5 разделов, на телефоне внизу, на компьютере сбоку", async ({ page, isMobile }) => {
  await page.goto("/");
  const links = page.getByRole("navigation", { name: "Основное меню" }).last().getByRole("link");
  if (isMobile || (page.viewportSize()?.width ?? 1000) < 768) {
    const nav = page.locator("nav.fixed");
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link")).toHaveCount(5);
    const box = await nav.boundingBox();
    expect(box!.y + box!.height).toBeGreaterThan((page.viewportSize()!.height) - 2);
    for (const l of await nav.getByRole("link").all()) expect((await l.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  } else {
    await expect(page.locator("aside")).toBeVisible();
    await expect(page.locator("aside").getByRole("link")).toHaveCount(6); // логотип + 5 разделов
  }
  void links;
});

test("на экране 320px нет горизонтальной прокрутки", async ({ page }) => {
  for (const url of ["/", "/onboarding", "/professions", "/learn"]) {
    await page.goto(url);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, url).toBeLessThanOrEqual(0);
  }
});

test("API онбординга отклоняет лишние поля и неизвестные значения", async ({ request }) => {
  expect((await request.post("/api/onboarding", { data: { name: "Иван" } })).status()).toBe(400);
  expect((await request.post("/api/onboarding", { data: { lang: "de" } })).status()).toBe(400);
  expect((await request.post("/api/onboarding", { data: "не json", headers: { "content-type": "application/json" } })).status()).toBe(400);
});
