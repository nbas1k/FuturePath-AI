// Реестр всех 27 функций FuturePath AI. Единственный источник правды для страницы «Все возможности»,
// ссылок в разделах и таблицы аудита. Статус проверен по коду (серверная логика, API, интерфейс, сохранение, тесты) и в браузере.
//  ready   — работает полностью (в пределах указанных ограничений)
//  partial — работает частично, ограничение объяснено
//  missing — не реализована: кнопки запуска нет
export type FeatureStatus = "ready" | "partial" | "missing";
export type FeatureCategory = "A" | "B" | "C" | "D" | "E" | "F";
export type FeatureSection = "path" | "learn" | "professions" | "profile";
export type Needs = "none" | "profession" | "test";

export const CATEGORY_LABELS: Record<FeatureCategory, string> = {
  A: "Профессии",
  B: "Диагностика",
  C: "Практика",
  D: "Обучение",
  E: "Будущее и карьера",
  F: "Результаты",
};

export const STATUS_LABELS: Record<FeatureStatus, string> = { ready: "Работает", partial: "Частично", missing: "Не реализовано" };

export type Feature = {
  n: number;
  title: string;
  desc: string;
  category: FeatureCategory;
  section: FeatureSection; // в каком из пяти разделов находится
  status: FeatureStatus;
  href: string | null; // прямая ссылка на инструмент (null — функции нет)
  needs: Needs; // что нужно для открытия
  limit: string; // ограничения и пояснения
  where: string; // где в коде
};

export const FEATURES: Feature[] = [
  { n: 1, title: "Тест профессиональных интересов", desc: "24 вопроса об интересах и склонностях. Баллы считают правила, без ИИ.", category: "A", section: "path", status: "ready", href: "/test", needs: "none", limit: "Это подсказка для размышления, не психодиагностика. Необязателен для подготовки к работе с ИИ.", where: "src/app/test, src/recommendation-engine, /api/result" },
  { n: 2, title: "Подбор профессий", desc: "Топ-5 профессий из каталога с объяснением: что совпало, какие навыки развивать, что изменит ИИ. Сравнение и выбор профессии.", category: "A", section: "path", status: "ready", href: "/result", needs: "test", limit: "Нужен пройденный тест.", where: "src/app/result, src/recommendation-engine" },
  { n: 3, title: "Каталог 108 профессий", desc: "Поиск, фильтры, избранное, подробные карточки с навыками и влиянием ИИ.", category: "A", section: "professions", status: "ready", href: "/professions", needs: "none", limit: "Описания составлены авторами как ориентир, без зарплат и статистики.", where: "src/data/professions, src/app/professions" },
  { n: 4, title: "Сравнение профессий", desc: "Две профессии рядом: обязанности, навыки, подготовка, влияние ИИ.", category: "A", section: "professions", status: "ready", href: "/compare", needs: "none", limit: "", where: "src/app/compare" },
  { n: 5, title: "Смена профессии", desc: "Какие навыки совпадают у двух профессий и что нужно добавить.", category: "A", section: "professions", status: "ready", href: "/professions/switch", needs: "none", limit: "Близкие по смыслу навыки находятся по общим словам и требуют проверки человеком.", where: "src/app/professions/switch, src/career/switch.ts" },

  { n: 6, title: "AI-диагностика профиля", desc: "ИИ разбирает результат теста: сильные стороны, интересы, недостающие навыки.", category: "B", section: "path", status: "partial", href: "/ai", needs: "test", limit: "Опирается на результат теста и каталог. Полный анализ опыта и текущих навыков пользователя не реализован. Нужен пройденный тест.", where: "src/app/ai, /api/ai/analysis, src/backend/ai" },
  { n: 7, title: "Анализ пробелов в навыках", desc: "Самооценка сравнивается с результатами заданий: где пробел, где завышена оценка.", category: "B", section: "path", status: "ready", href: "/learn?tab=skills", needs: "profession", limit: "Подтверждение даёт только самостоятельное выполнение заданий (3 профессии). Самооценка не считается подтверждением.", where: "src/skills/map.ts, src/backend/skillMap.ts" },
  { n: 8, title: "Карта навыков", desc: "Диаграмма: самооценка и навыки, подтверждённые заданиями.", category: "B", section: "path", status: "ready", href: "/learn?tab=skills", needs: "profession", limit: "Подтверждённые навыки есть только у профессий с заданиями (3).", where: "src/components/SkillMapPanel.tsx" },
  { n: 9, title: "Практическая проверка навыка", desc: "Диагностика без ИИ и независимая повторная проверка по одним критериям.", category: "B", section: "learn", status: "ready", href: "/learn?tab=cycle", needs: "profession", limit: "3 профессии, 3 навыка в каждой, 3 задания на навык: это индикатор, не доказательство освоения.", where: "src/backend/cycle.ts, src/data/cycle, /api/cycle" },
  { n: 10, title: "Влияние ИИ на профессию", desc: "Что ИИ может взять на себя и что остаётся важным человеку.", category: "B", section: "path", status: "ready", href: "/professions/software-developer", needs: "none", limit: "Качественное описание из каталога, не прогноз. Раздел «Влияние искусственного интеллекта» есть в каждой из 108 профессий и на втором шаге цикла.", where: "src/data/professions, src/app/professions/[id]" },

  { n: 11, title: "Симулятор рабочего дня", desc: "Четыре рабочие ситуации, решения, последствия и метрики.", category: "C", section: "learn", status: "ready", href: "/learn?tab=sim", needs: "profession", limit: "3 профессии. Последствия — упрощённая модель, не прогноз.", where: "src/backend/simulator.ts, /api/sim" },
  { n: 12, title: "Человек + ИИ", desc: "Задания сначала самостоятельно, потом с подсказками настоящего ИИ, затем сравнение.", category: "C", section: "learn", status: "ready", href: "/learn?tab=challenge", needs: "profession", limit: "3 профессии. Нужен подключённый ИИ: подсказки не подделываются.", where: "src/backend/challenge.ts, /api/challenge" },
  { n: 13, title: "Лаборатория мягких навыков", desc: "Шесть рабочих ситуаций: коммуникация, команда, время, решение проблем.", category: "C", section: "learn", status: "ready", href: "/learn?tab=soft", needs: "none", limit: "Упражнение на размышление, не психологический тест.", where: "src/backend/softSkills.ts, /api/soft" },
  { n: 14, title: "Командные проекты", desc: "Совместная работа над проектами с участниками, задачами и результатами.", category: "C", section: "learn", status: "missing", href: null, needs: "none", limit: "Не реализовано: нужны учётные записи и роли. Сейчас профиль привязан к cookie браузера без пароля, поэтому безопасно хранить участников нельзя.", where: "—" },
  { n: 15, title: "Адаптивная сложность", desc: "Следующая ситуация подбирается по результату предыдущей.", category: "C", section: "learn", status: "partial", href: "/learn?tab=soft", needs: "none", limit: "Работает только в лаборатории мягких навыков. В курсах, цикле и собеседовании сложность фиксированная.", where: "src/softskills/logic.ts" },

  { n: 16, title: "AI-наставник", desc: "Диалог с настоящим ИИ с историей. Знает профессию, ошибки и подтверждённые навыки.", category: "D", section: "learn", status: "ready", href: "/learn?tab=mentor", needs: "profession", limit: "Нужен подключённый ИИ. Не отвечает на активные задания. Ответы могут быть неточными.", where: "src/backend/mentor.ts, /api/mentor" },
  { n: 17, title: "Мини-курсы Academy", desc: "Мини-уроки и проверки по профессии.", category: "D", section: "learn", status: "partial", href: "/learn?tab=course", needs: "profession", limit: "Только для 3 профессий (3 урока и 4 задания в каждом). Для остальных курсов нет.", where: "src/data/track.ts, /api/track" },
  { n: 18, title: "Персональный план обучения", desc: "План по ошибкам диагностики: для каждого пробела урок и упражнение.", category: "D", section: "learn", status: "ready", href: "/learn?tab=cycle", needs: "profession", limit: "3 профессии. План строится по ошибкам, а не по расписанию.", where: "src/backend/cycle.ts" },
  { n: 19, title: "Образовательные ресурсы", desc: "Проверенные публичные сайты для обучения.", category: "D", section: "learn", status: "ready", href: "/learn?tab=resources", needs: "none", limit: "Ссылки проверены на доступность 2026-11-09. Условия смотрите на сайтах.", where: "src/data/resources.ts" },
  { n: 20, title: "Университеты Казахстана", desc: "Университеты и программы с источниками.", category: "D", section: "professions", status: "missing", href: null, needs: "none", limit: "Не реализовано: нет проверенных данных с источниками, выдумывать их мы не стали.", where: "—" },

  { n: 21, title: "Сценарии будущего 2030–2035", desc: "Три возможных сценария изменения профессии. Это не прогноз.", category: "E", section: "professions", status: "ready", href: "/learn?tab=scenarios", needs: "profession", limit: "Нужен подключённый ИИ. Качественные сценарии без цифр.", where: "src/backend/scenarios.ts, /api/scenarios" },
  { n: 22, title: "Тенденции рынка труда Казахстана", desc: "Проверяемые тенденции с источниками и датами.", category: "E", section: "professions", status: "missing", href: null, needs: "none", limit: "Не реализовано: нет проверенных данных с источниками и датами, выдумывать их мы не стали.", where: "—" },
  { n: 23, title: "Тренажёр собеседований", desc: "6 вопросов по профессии, оценка ИИ по трём критериям, разбор.", category: "E", section: "professions", status: "ready", href: "/learn?tab=interview", needs: "profession", limit: "3 профессии. Нужен подключённый ИИ для разбора (ответы сохраняются). Оценка может быть неточной.", where: "src/backend/interview.ts, /api/interview" },

  { n: 24, title: "Паспорт навыков", desc: "Подтверждённые заданиями навыки, курсы, результаты, достижения. Печать в PDF.", category: "F", section: "profile", status: "ready", href: "/profile/passport", needs: "profession", limit: "Строится по выбранной профессии. Самооценка показана отдельно и подтверждением не считается.", where: "src/app/profile/passport" },
  { n: 25, title: "Портфолио проектов", desc: "Проекты, которые вы добавили сами. Печать в PDF.", category: "F", section: "profile", status: "ready", href: "/profile/portfolio", needs: "none", limit: "Платформа проекты не проверяет.", where: "src/app/profile/portfolio, /api/portfolio" },
  { n: 26, title: "Аналитика прогресса", desc: "Графики, сравнение первой и последней попытки, история обучения.", category: "F", section: "profile", status: "ready", href: "/profile", needs: "none", limit: "Данные появляются после первых заданий.", where: "src/backend/analytics.ts, src/components/ProgressPanel.tsx" },
  { n: 27, title: "Кабинет преподавателя", desc: "Отдельный кабинет с контролем доступа.", category: "F", section: "profile", status: "missing", href: null, needs: "none", limit: "Не реализовано: нужны учётные записи, роли и безопасная авторизация, которых в проекте нет.", where: "—" },
];

export const featuresIn = (section: FeatureSection) => FEATURES.filter((f) => f.section === section);

export const COUNTS = {
  ready: FEATURES.filter((f) => f.status === "ready").length,
  partial: FEATURES.filter((f) => f.status === "partial").length,
  missing: FEATURES.filter((f) => f.status === "missing").length,
};
