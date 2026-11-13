import { expect, test } from "@playwright/test";
import { readFileSync } from "fs";

const adminSecret = () => (readFileSync(".env", "utf8").match(/^ADMIN_SECRET="?([^"\r\n]+)"?/m) ?? [])[1] ?? "";

test("симуляция (бизнес) по API: шаги, отчёт, XP один раз; ответы не утекают на страницу", async ({ page }) => {
  const html = await page.goto("/learn/sim/sim:doctor-day").then((r) => r!.text());
  expect(html).not.toContain("Около пяти дней"); // ответы «пациента» приходят только после выбора
  expect(html).not.toContain('"credit"');
  const run = async (body: object) => (await page.request.post("/api/sim/run", { data: body }));
  const start = await (await run({ action: "start", simId: "sim:entrepreneur-client" })).json();
  expect((await run({ action: "step", runId: start.runId, stepId: "s2", answer: 1 })).status()).toBe(400); // нельзя перепрыгнуть
  for (const [stepId, answer] of [["s1", 1], ["s2", 1], ["s3", 0], ["n1", 60]] as const) expect((await run({ action: "step", runId: start.runId, stepId, answer })).ok()).toBe(true);
  const fin = await (await run({ action: "finish", runId: start.runId })).json();
  expect(fin.report.score).toBeCloseTo(1, 5);
  expect(fin.xp).toBe(50);
  const again = await (await run({ action: "start", simId: "sim:entrepreneur-client" })).json();
  for (const [stepId, answer] of [["s1", 1], ["s2", 1], ["s3", 0], ["n1", 60]] as const) await run({ action: "step", runId: again.runId, stepId, answer });
  const fin2 = await (await run({ action: "finish", runId: again.runId })).json();
  expect(fin2.xp).toBe(0); // XP за симуляцию только один раз
  expect((await run({ action: "step", runId: "чужой", stepId: "s1", answer: 0 })).status()).toBe(404);
});

test("симуляция (архитектура) в интерфейсе: числа, подсказка, отчёт", async ({ page }) => {
  await page.goto("/learn/sim/sim:architect-plan");
  await expect(page.getByRole("note")).toContainText("Учебная симуляция");
  await page.getByLabel(/Ваш ответ/).fill("50");
  await page.getByRole("button", { name: "Ответить" }).click();
  await expect(page.getByRole("status")).toContainText("Умножьте");
  await page.getByRole("button", { name: "Дальше" }).click();
  for (const v of ["20", "10,5", "30,5"]) { await page.getByLabel(/Ваш ответ/).fill(v); await page.getByRole("button", { name: "Ответить" }).click(); await page.getByRole("button", { name: "Дальше" }).click(); }
  await page.getByRole("button", { name: /У окна|В части гостиной/ }).click();
  await page.getByRole("button", { name: "Ответить" }).click();
  await page.getByRole("button", { name: "Завершить и получить отчёт" }).click();
  await expect(page.getByRole("heading", { name: "Итоговый отчёт" })).toBeVisible();
});

test("редактор кода: тесты выполняются в браузере, результат отправляется, сервер код не запускает", async ({ page }) => {
  await page.goto("/learn/sim/sim:developer-code");
  await expect(page.getByRole("note")).toContainText("не на сервере");
  await page.getByLabel("Редактор кода").fill("function sumEven(numbers) { return numbers.filter(n => n % 2 === 0).reduce((a, b) => a + b, 0); }");
  await page.getByRole("button", { name: "Запустить тесты" }).click();
  await expect(page.getByText("Пройдено 5 из 5")).toBeVisible();
  await page.getByRole("button", { name: "Отправить результат" }).click();
  await expect(page.getByText("Результат отправлен")).toBeVisible();
  // ошибка: бесконечный цикл останавливается
  await page.getByLabel("Редактор кода").fill("function sumEven(n) { while (true) {} }");
  await page.getByRole("button", { name: "Запустить тесты" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("слишком долго", { timeout: 6000 });
  await page.getByLabel("Редактор кода").fill("function sumEven(n) { return n.foo.bar; }");
  await page.getByRole("button", { name: "Запустить тесты" }).click();
  await expect(page.getByText(/Пройдено 0 из 5/)).toBeVisible();
  // подставной результат отклоняется
  expect((await page.request.post("/api/sim/run", { data: { action: "finish_code", simId: "sim:developer-code", passed: 99, total: 5 } })).status()).toBe(400);
});

test("голосовая практика: согласие обязательно, текстовая альтернатива, честное сообщение о недоступном ИИ", async ({ page }) => {
  expect((await page.request.post("/api/voice/evaluate", { data: { promptId: "voice-patient", transcript: "текст", consent: false, source: "text" } })).status()).toBe(400);
  await page.goto("/learn/voice/voice-patient");
  await expect(page.getByRole("button", { name: "Оценить ответ" })).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByLabel(/Ответ \(можно исправить/).fill("Нужно мыть руки перед едой, потому что на них бывают микробы. Это защищает здоровье. Например, намыльте руки мылом и мойте 20 секунд.");
  await page.getByRole("button", { name: "Оценить ответ" }).click();
  await expect(page.getByRole("heading", { name: "Результат по рубрике" })).toBeVisible();
  await expect(page.getByText("Профессиональные понятия")).toBeVisible();
  await expect(page.getByText(/ИИ-разбор недоступен/)).toBeVisible(); // без подставного ответа
  await expect(page.getByText(/не голос, уверенность или эмоции/)).toBeVisible();
});

test("ИИ-наставник: при отсутствии подключения честное сообщение и рекомендации без ИИ", async ({ page }) => {
  const st = await (await page.request.get("/api/learn/mentor?lessonId=skill:communication/m1/l1")).json();
  expect(st.aiEnabled).toBe(false);
  await page.goto("/learn/lesson/skill:communication~m1~l1");
  await page.getByRole("button", { name: "Далее" }).click();
  await page.getByRole("button", { name: "Начать упражнения" }).click();
  await page.getByRole("button", { name: "Спросить наставника" }).click();
  await expect(page.getByRole("dialog")).toContainText("недоступен");
  const r = await page.request.post("/api/learn/mentor", { data: { lessonId: "skill:communication/m1/l1", mode: "hint", message: "" } });
  expect(r.status()).toBe(503);
  expect((await page.request.post("/api/learn/mentor", { data: { lessonId: "x", mode: "взлом" } })).status()).toBe(400);
});

test("прогресс: уровень, XP, неделя, достижения, навыки", async ({ page }) => {
  await page.request.post("/api/onboarding", { data: { complete: true } });
  await page.goto("/learn/sim/sim:entrepreneur-client");
  const run = (b: object) => page.request.post("/api/sim/run", { data: b });
  const s = await (await run({ action: "start", simId: "sim:entrepreneur-client" })).json();
  for (const [stepId, answer] of [["s1", 1], ["s2", 1], ["s3", 0], ["n1", 60]] as const) await run({ action: "step", runId: s.runId, stepId, answer });
  await run({ action: "finish", runId: s.runId });
  await page.goto("/progress");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Прогресс");
  await expect(page.getByText("Достижения")).toBeVisible();
  await expect(page.getByText("Один день в профессии").first()).toBeVisible();
  await expect(page.getByRole("progressbar")).toBeVisible();
});

test("админ-панель: закрыта без секрета, публикация только через проверку, правка каталога", async ({ page, request }) => {
  expect((await request.get("/api/admin")).status()).toBe(403);
  expect((await request.post("/api/admin", { data: { action: "set_lesson", id: "x", status: "draft" } })).status()).toBe(403);
  expect((await request.post("/api/admin", { data: { action: "login", secret: "неверный" } })).status()).toBe(401);
  const secret = adminSecret();
  test.skip(!secret, "ADMIN_SECRET не задан");
  const ok = await page.request.post("/api/admin", { data: { action: "login", secret } });
  expect(ok.status()).toBe(200);
  await expect.poll(async () => (await page.request.get("/api/admin")).status(), { timeout: 30_000 }).toBe(200);
  const tree = await (await page.request.get("/api/admin")).json();
  expect(tree.modules.length).toBeGreaterThan(10);

  const post = (b: object) => page.request.post("/api/admin", { data: b });
  expect((await post({ action: "set_career", careerId: "welder", status: "draft" })).status()).toBe(200);
  expect((await post({ action: "set_career", careerId: "welder", status: "published" })).status()).toBe(409); // сразу публиковать нельзя
  expect((await page.request.get("/professions/welder")).status()).toBe(404); // скрыта
  expect((await post({ action: "set_career", careerId: "welder", status: "review", titleEn: "Welder (edited)" })).status()).toBe(200);
  expect((await post({ action: "set_career", careerId: "welder", status: "published", titleEn: "Welder" })).status()).toBe(200);
  expect((await page.request.get("/professions/welder")).status()).toBe(200);
  expect((await post({ action: "set_exercise", id: tree.modules[0].lessons[0].id + "/e1", answerKey: "не json" })).status()).toBe(400);
  expect((await post({ action: "set_lesson", id: "нет", status: "review" })).status()).toBe(404);
});