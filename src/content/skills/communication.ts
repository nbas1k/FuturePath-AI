import type { TrackDef } from "@/learn/types";

// Универсальный навык «Коммуникация». Материал — учебный черновик, экспертной проверки не проходил.
// Идентификаторы компетенций: us:<навык> (универсальные навыки каталога).
export const COMMUNICATION: TrackDef = {
  id: "skill:communication",
  kind: "skill",
  modules: [
    {
      id: "skill:communication/m1",
      title: { ru: "Слушать и объяснять", en: "Listen and explain" },
      summary: { ru: "Базовые приёмы ясного общения", en: "Basic techniques of clear communication" },
      lessons: [
        {
          id: "skill:communication/m1/l1",
          title: { ru: "Активное слушание", en: "Active listening" },
          minutes: 5,
          objectives: [{ ru: "Отличать активное слушание от пассивного", en: "Tell active listening from passive" }, { ru: "Применить уточняющие вопросы и перефразирование", en: "Use clarifying questions and paraphrasing" }],
          comps: ["us:communication", "us:emotional"],
          theory: [
            { kind: "explain", text: { ru: "Активное слушание — это когда вы не просто молчите, а показываете, что поняли собеседника: кивком, уточняющим вопросом и пересказом своими словами.", en: "Active listening means showing you understood: a nod, a clarifying question and a paraphrase in your own words." } },
            { kind: "example", text: { ru: "Коллега говорит: «Отчёт не готов, там всё сложно». Вы отвечаете: «Правильно понимаю, что не хватает данных от отдела продаж?» — это перефразирование и уточнение.", en: "A colleague says: “The report isn’t ready, it’s complicated.” You reply: “Do I understand correctly that sales data is missing?” That is a paraphrase plus a clarification." } },
          ],
          exercises: [
            { type: "choice", phase: "first", prompt: { ru: "Что лучше всего показывает, что вы слушаете активно?", en: "What best shows you are listening actively?" }, options: [{ ru: "Смотреть в телефон и кивать", en: "Look at your phone and nod" }, { ru: "Пересказать главное своими словами и уточнить непонятное", en: "Restate the main point and clarify what is unclear" }, { ru: "Перебить, чтобы быстрее дать совет", en: "Interrupt to give advice sooner" }], correct: 1, explain: { ru: "Перефразирование и уточнения показывают, что вы поняли собеседника.", en: "Paraphrasing and clarifying show that you understood." } },
            { type: "multi", phase: "first", prompt: { ru: "Выберите приёмы активного слушания (несколько ответов).", en: "Select active listening techniques (several answers)." }, options: [{ ru: "Уточняющие вопросы", en: "Clarifying questions" }, { ru: "Перебивание", en: "Interrupting" }, { ru: "Перефразирование", en: "Paraphrasing" }, { ru: "Отвлечение на другие дела", en: "Doing other things" }], correct: [0, 2], explain: { ru: "Уточнения и перефразирование помогают понять, а перебивание и отвлечение мешают.", en: "Clarifying and paraphrasing help understanding; interrupting and distraction hurt it." } },
            { type: "match", phase: "harder", prompt: { ru: "Сопоставьте фразу и приём.", en: "Match each phrase with a technique." }, pairs: [[{ ru: "«Если я правильно понял, вы хотите…»", en: "“If I understood correctly, you want…”" }, { ru: "Перефразирование", en: "Paraphrasing" }], [{ ru: "«Что вы имеете в виду под «срочно»?»", en: "“What do you mean by ‘urgent’?”" }, { ru: "Уточнение", en: "Clarifying" }], [{ ru: "«Понимаю, это было неприятно»", en: "“I see, that must have been unpleasant”" }, { ru: "Отражение чувств", en: "Reflecting feelings" }]], explain: { ru: "Каждый приём решает свою задачу: проверить смысл, уточнить детали или признать чувства.", en: "Each technique has its job: check meaning, clarify details or acknowledge feelings." } },
            { type: "fill", phase: "apply", prompt: { ru: "Чтобы убедиться, что вы поняли, нужно ___ сказанное своими словами.", en: "To make sure you understood, ___ what was said in your own words." }, blanks: [["перефразировать", "пересказать", "переформулировать"]], explain: { ru: "Перефразирование проверяет понимание.", en: "Paraphrasing checks understanding." } },
            { type: "case", phase: "check", scenario: { ru: "Клиент раздражённо говорит: «Вы третий раз присылаете не тот документ!»", en: "A client says irritably: “This is the third time you sent the wrong document!”" }, prompt: { ru: "Какой ответ лучше всего начать с активного слушания?", en: "Which reply best starts with active listening?" }, options: [{ ru: "«Это не наша вина»", en: "“It’s not our fault”" }, { ru: "«Понимаю, это раздражает. Уточните, пожалуйста, какой документ вам нужен?»", en: "“I see, that’s frustrating. Could you tell me which document you need?”" }, { ru: "«Успокойтесь»", en: "“Calm down”" }], correct: 1, optionFeedback: [{ ru: "Это защита, а не слушание.", en: "That is defensive, not listening." }, { ru: "Верно: признаёт чувство и уточняет задачу.", en: "Right: acknowledges the feeling and clarifies the task." }, { ru: "Такая фраза обычно усиливает раздражение.", en: "Such a phrase usually increases irritation." }], explain: { ru: "Сначала признать чувство, затем уточнить, что именно нужно.", en: "First acknowledge the feeling, then clarify what is needed." } },
          ],
        },
        {
          id: "skill:communication/m1/l2",
          title: { ru: "Ясное объяснение", en: "Clear explanation" },
          minutes: 6,
          objectives: [{ ru: "Строить объяснение по шагам", en: "Build an explanation step by step" }, { ru: "Объяснять без лишнего жаргона", en: "Explain without unnecessary jargon" }],
          comps: ["us:communication", "us:teamwork"],
          theory: [
            { kind: "explain", text: { ru: "Ясное объяснение строится так: главная мысль, затем два-три шага или довода, затем пример. Профессиональные термины объясняйте или заменяйте простыми словами.", en: "A clear explanation goes: main point, then two or three steps or arguments, then an example. Explain jargon or replace it with plain words." } },
            { kind: "example", text: { ru: "«Кэш — это быстрая память: сайт запоминает уже загруженное, поэтому открывается быстрее. Например, логотип не скачивается заново при каждом переходе.»", en: "“A cache is quick memory: a site remembers what it has loaded, so it opens faster. For example, the logo is not downloaded again on every click.”" } },
          ],
          exercises: [
            { type: "order", phase: "first", prompt: { ru: "Расположите части объяснения в удачном порядке.", en: "Put the parts of an explanation in a good order." }, items: [{ ru: "Главная мысль", en: "Main point" }, { ru: "Шаги или доводы", en: "Steps or arguments" }, { ru: "Пример", en: "Example" }, { ru: "Проверка понимания", en: "Check understanding" }], explain: { ru: "Сначала суть, потом детали, затем пример и проверка, понял ли собеседник.", en: "Start with the point, then details, then an example and a check that the listener understood." } },
            { type: "choice", phase: "first", prompt: { ru: "Вы объясняете бабушке, что такое облачное хранилище. Что сработает лучше?", en: "You explain cloud storage to a grandparent. What works best?" }, options: [{ ru: "«Это распределённый кластер серверов с репликацией»", en: "“It’s a distributed server cluster with replication”" }, { ru: "«Это как сейф для фотографий в интернете: открыть можно с любого телефона»", en: "“It’s like a photo safe on the internet: you can open it from any phone”" }, { ru: "«Погугли»", en: "“Just google it”" }], correct: 1, explain: { ru: "Сравнение с понятным предметом помогает без жаргона.", en: "A comparison with something familiar helps avoid jargon." } },
            { type: "multi", phase: "harder", prompt: { ru: "Что делает объяснение понятнее?", en: "What makes an explanation clearer?" }, options: [{ ru: "Конкретный пример", en: "A concrete example" }, { ru: "Много терминов без пояснений", en: "Many terms without explanation" }, { ru: "Короткие шаги", en: "Short steps" }, { ru: "Сразу все детали подряд", en: "All details at once" }], correct: [0, 2], explain: { ru: "Примеры и короткие шаги помогают удержать внимание и понять.", en: "Examples and short steps help people follow." } },
            { type: "text", phase: "apply", prompt: { ru: "Объясните в 2–3 предложениях, зачем нужна резервная копия файлов.", en: "Explain in 2–3 sentences why file backups matter." }, groups: [["копи", "дубл"], ["потер", "сбо", "поломк", "удал"], ["восстанов", "вернуть", "вернут"]], min: 2, explain: { ru: "Хорошее объяснение называет суть (копия), риск (потеря) и пользу (восстановление). Проверка по ключевым словам: это упрощённая автоматическая проверка.", en: "A good answer names the essence (a copy), the risk (loss) and the benefit (recovery). Keyword check: a simplified automatic check." } },
            { type: "project", phase: "check", prompt: { ru: "Мини-проект: объясните вслух другу одну тему из учебы за 1 минуту и отметьте, что получилось.", en: "Mini-project: explain one study topic to a friend in 1 minute and tick what you did." }, checklist: [{ ru: "Начал с главной мысли", en: "Started with the main point" }, { ru: "Привёл пример", en: "Gave an example" }, { ru: "Проверил, понял ли собеседник", en: "Checked that the listener understood" }], explain: { ru: "Это самоотчёт: он не проверяется автоматически и не повышает уровень навыка, но помогает закрепить приём.", en: "This is a self-report: it is not auto-checked and does not raise the skill level, but it reinforces the technique." } },
          ],
        },
      ],
    },
  ],
};
