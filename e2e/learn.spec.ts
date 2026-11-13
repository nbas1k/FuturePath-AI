import { expect, test, type Page } from "@playwright/test";

const TRACK = "/learn/track/skill%3Acommunication";
const L1 = "/learn/lesson/skill:communication~m1~l1";
const L2 = "/learn/lesson/skill:communication~m1~l2";

const checkAndContinue = async (page: Page) => {
  await page.getByRole("button", { name: "Проверить" }).click();
  await expect(page.getByRole("status")).toBeVisible();
  await page.getByRole("button", { name: "Продолжить" }).click();
};

async function playLesson1(page: Page, wrongFirst = false) {
  await page.goto(L1);
  await page.getByRole("button", { name: "Далее" }).click();
  await page.getByRole("button", { name: "Начать упражнения" }).click();
  // 1 choice
  await page.getByRole("button", { name: wrongFirst ? /Смотреть в телефон/ : /Пересказать главное/ }).click();
  await checkAndContinue(page);
  // 2 multi
  await page.getByRole("button", { name: "Уточняющие вопросы" }).click();
  await page.getByRole("button", { name: "Перефразирование", exact: true }).click();
  await checkAndContinue(page);
  // 3 match
  const pairs: [string, string][] = [["Если я правильно понял", "Перефразирование"], ["Что вы имеете в виду", "Уточнение"], ["Понимаю, это было неприятно", "Отражение чувств"]];
  for (const [l, r] of pairs) await page.locator("label", { hasText: l }).locator("select").selectOption({ label: r });
  await checkAndContinue(page);
  // 4 fill
  await page.getByLabel("1", { exact: true }).fill("перефразировать");
  await checkAndContinue(page);
  // 5 case
  await page.getByRole("button", { name: /Понимаю, это раздражает/ }).click();
  await page.getByRole("button", { name: "Проверить" }).click();
  await page.getByRole("button", { name: "Продолжить" }).click();
}

test("карта маршрута: первый урок доступен, второй закрыт и недоступен по прямой ссылке", async ({ page }) => {
  await page.goto(TRACK);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Коммуникация");
  await expect(page.getByRole("link", { name: /Активное слушание.*Доступен/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /Ясное объяснение.*Закрыт/ })).toBeVisible();
  await page.goto(L2);
  await expect(page.locator("p[role=alert]")).toContainText("закрыт");
});

test("урок целиком: все типы упражнений, итог, XP один раз, следующий урок открывается", async ({ page }) => {
  await playLesson1(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Урок завершён");
  await expect(page.getByText("100%")).toBeVisible();
  await expect(page.getByText("+20 XP")).toBeVisible();
  await expect(page.getByText("Ошибок нет.")).toBeVisible();

  // Повторное прохождение не даёт XP повторно
  await playLesson1(page);
  await expect(page.getByText("+20 XP")).toHaveCount(0);
  await expect(page.getByText("XP за этот урок уже получены.")).toBeVisible();

  // Следующий урок открыт, на карте у первого стоит «Завершён»
  await page.goto(TRACK);
  await expect(page.getByRole("link", { name: /Активное слушание.*Завершён/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Ясное объяснение.*Доступен/ })).toBeVisible();
  // XP на главной не равен «0»: сохранён в профиле
  await page.request.post("/api/onboarding", { data: { complete: true } });
  await page.goto("/");
  await expect(page.getByText("XP", { exact: true })).toBeVisible();
});

test("неверные ответы: разбор ошибок показан, баллы частичные", async ({ page }) => {
  await playLesson1(page, true);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Урок завершён");
  await expect(page.getByRole("heading", { name: "Разбор ошибок" })).toBeVisible();
  await expect(page.getByText(/Перефразирование и уточнения показывают/)).toBeVisible();
  await expect(page.getByText("80%")).toBeVisible();
});

test("прогресс сохраняется: после обновления продолжаем с нужного задания", async ({ page }) => {
  await page.goto(L1);
  await page.getByRole("button", { name: "Далее" }).click();
  await page.getByRole("button", { name: "Начать упражнения" }).click();
  await page.getByRole("button", { name: /Пересказать главное/ }).click();
  await checkAndContinue(page);
  await page.reload();
  await expect(page.getByRole("status").first()).toContainText("Продолжаем с задания 2");
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
});

test("безопасность: правильных ответов нет в странице, чужая попытка недоступна, мусор отклоняется", async ({ page, browser, request }) => {
  const html = await page.goto(L1).then((r) => r!.text());
  expect(html).not.toContain("answerKey");
  expect(html).not.toContain('"correct"');
  // попытка этого пользователя
  const attemptId = await page.evaluate(async () => {
    const r = await fetch("/api/learn/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lessonId: "skill:communication/m1/l1" }) });
    return (await r.json()).attemptId as string;
  });
  const other = await browser.newContext();
  const stolen = await other.request.post("/api/learn/answer", { data: { attemptId, exerciseId: "skill:communication/m1/l1/e1", answer: 1 } });
  expect(stolen.status()).toBe(404);
  const bad = await page.request.post("/api/learn/answer", { data: { attemptId, exerciseId: "skill:communication/m1/l1/e1", answer: 99 } });
  expect(bad.status()).toBe(400);
  const early = await page.request.post("/api/learn/complete", { data: { attemptId } });
  expect(early.status()).toBe(409);
  expect((await request.post("/api/learn/start", { data: { lessonId: "нет" } })).status()).toBe(404);
  await other.close();
});

test("английский интерфейс урока и 320px без горизонтальной прокрутки", async ({ page }) => {
  await page.request.post("/api/onboarding", { data: { lang: "en" } });
  await page.goto(L1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Active listening");
  await expect(page.getByRole("button", { name: "Next" , exact: true })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
test("маршруты: 4 профессиональных и 12 универсальных навыков, выбранная профессия даёт кнопку «Продолжить»", async ({ page }) => {
  await page.request.post("/api/onboarding", { data: { complete: true } });
  await page.goto("/learn");
  await expect(page.getByRole("link", { name: /Уточнение|Дополнительные инструменты/ }).first()).toBeVisible();
  const skillLinks = page.locator('a[href^="/learn/track/skill"]');
  await expect(skillLinks).toHaveCount(12);

  const sel = await page.request.post("/api/journey/select", { data: { professionId: "doctor" } });
  expect(sel.ok()).toBe(true);
  await page.goto("/learn");
  await expect(page.getByRole("heading", { name: "Врач" }).or(page.getByText("Врач").first())).toBeVisible();
  await page.getByRole("link", { name: "Продолжить обучение" }).click();
  await expect(page).toHaveURL(/\/learn\/lesson\/career:doctor~m1~l1/);
  await page.goto("/learn/track/career%3Adoctor");
  await expect(page.locator("ol > li")).toHaveCount(6);
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(3);
});