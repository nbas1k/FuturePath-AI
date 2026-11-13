import { expect, test } from "@playwright/test";

const uniq = () => `user${Date.now()}${Math.floor(Math.random() * 1e6)}@example.com`;

test("регистрация сохраняет анонимный прогресс, выход и повторный вход возвращают его", async ({ page, browser }) => {
  // анонимный прогресс: онбординг
  await page.request.post("/api/onboarding", { data: { lang: "ru", goal: "learn", complete: true } });
  const email = uniq();
  await page.goto("/account");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/Пароль/).fill("Pass-word-123");
  await page.getByRole("button", { name: "Регистрация" }).last().click();
  await expect(page).toHaveURL(/\/profile/);

  // тот же прогресс после регистрации
  let st = await (await page.request.get("/api/onboarding")).json();
  expect(st).toMatchObject({ done: true, goal: "learn" });
  expect(await (await page.request.get("/api/auth")).json()).toEqual({ loggedIn: true, email });

  // выход: сессия закрыта, анонимной cookie нет в новом контексте
  await page.request.post("/api/auth", { data: { action: "logout" } });
  expect(await (await page.request.get("/api/auth")).json()).toEqual({ loggedIn: false });

  // вход в чистом браузере возвращает прогресс
  const ctx = await browser.newContext();
  const bad = await ctx.request.post("/api/auth", { data: { action: "login", email, password: "wrong-password" } });
  expect(bad.status()).toBe(401);
  const ok = await ctx.request.post("/api/auth", { data: { action: "login", email: email.toUpperCase(), password: "Pass-word-123" } });
  expect(ok.status()).toBe(200);
  st = await (await ctx.request.get("/api/onboarding")).json();
  expect(st).toMatchObject({ done: true, goal: "learn" });
  await ctx.close();
});

test("защита: слабый пароль, повтор email, лишние поля, чужие данные недоступны без входа", async ({ request, browser }) => {
  expect((await request.post("/api/auth", { data: { action: "register", email: uniq(), password: "short" } })).status()).toBe(400);
  expect((await request.post("/api/auth", { data: { action: "register", email: "не-email", password: "12345678" } })).status()).toBe(400);
  expect((await request.post("/api/auth", { data: { action: "register", email: uniq(), password: "12345678", isAdmin: true } })).status()).toBe(400);
  const email = uniq();
  const a = await browser.newContext();
  expect((await a.request.post("/api/auth", { data: { action: "register", email, password: "12345678" } })).status()).toBe(200);
  const b = await browser.newContext();
  expect((await b.request.post("/api/auth", { data: { action: "register", email, password: "87654321" } })).status()).toBe(409);
  // у второго браузера нет доступа к профилю первого
  await a.request.post("/api/onboarding", { data: { goal: "skills" } });
  expect((await (await b.request.get("/api/onboarding")).json()).exists).toBe(false);
  // неверный пароль и несуществующий пользователь отвечают одинаково
  const wrong = await b.request.post("/api/auth", { data: { action: "login", email, password: "bad-password" } });
  const none = await b.request.post("/api/auth", { data: { action: "login", email: uniq(), password: "bad-password" } });
  expect(wrong.status()).toBe(401);
  expect(await wrong.json()).toEqual(await none.json());
  await a.close(); await b.close();
});

test("перебор пароля ограничивается", async ({ request }) => {
  const email = uniq();
  let last = 0;
  for (let i = 0; i < 12; i++) last = (await request.post("/api/auth", { data: { action: "login", email, password: "wrong-password" } })).status();
  expect(last).toBe(429);
});