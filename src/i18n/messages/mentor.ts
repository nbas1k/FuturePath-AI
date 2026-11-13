// Строки ИИ-наставника и симуляций. Подключаются в ru.ts / en.ts / kk.ts.
export const mentorRu = {
  "mentor.title": "ИИ-наставник",
  "mentor.open": "Спросить наставника",
  "mentor.close": "Закрыть",
  "mentor.unavailable": "ИИ-наставник сейчас недоступен: подключение к ИИ не настроено. Остальные функции урока работают.",
  "mentor.practice": "Рекомендуем повторить",
  "mentor.placeholder": "Задайте вопрос по теме урока…",
  "mentor.send": "Отправить",
  "mentor.thinking": "Наставник думает…",
  "mentor.error": "Не удалось получить ответ. Повторите попытку позже.",
  "mentor.note": "Ответы ИИ могут содержать ошибки. Важное проверяйте.",
  "mentor.mode.explain_simple": "Объяснить проще",
  "mentor.mode.example": "Привести пример",
  "mentor.mode.hint": "Подсказка",
  "mentor.mode.ask_question": "Задай мне вопрос",
  "mentor.mode.explain_error": "Разобрать ошибку",
  "mentor.mode.suggest_practice": "Предложить тренировку",
} as const;

export type MentorKey = keyof typeof mentorRu;

export const mentorEn: Record<MentorKey, string> = {
  "mentor.title": "AI mentor",
  "mentor.open": "Ask the mentor",
  "mentor.close": "Close",
  "mentor.unavailable": "The AI mentor is unavailable right now: the AI connection is not configured. The rest of the lesson works.",
  "mentor.practice": "We suggest reviewing",
  "mentor.placeholder": "Ask a question about the lesson topic…",
  "mentor.send": "Send",
  "mentor.thinking": "The mentor is thinking…",
  "mentor.error": "Could not get a reply. Please try again later.",
  "mentor.note": "AI answers may contain mistakes. Double-check what matters.",
  "mentor.mode.explain_simple": "Explain simpler",
  "mentor.mode.example": "Give an example",
  "mentor.mode.hint": "Hint",
  "mentor.mode.ask_question": "Ask me a question",
  "mentor.mode.explain_error": "Explain my mistake",
  "mentor.mode.suggest_practice": "Suggest practice",
};

// Қазақша: тіл иесі тексеруі қажет.
export const mentorKk: Record<MentorKey, string> = {
  "mentor.title": "ЖИ-тәлімгер",
  "mentor.open": "Тәлімгерден сұрау",
  "mentor.close": "Жабу",
  "mentor.unavailable": "ЖИ-тәлімгер қазір қолжетімсіз: ЖИ-ге қосылу бапталмаған. Сабақтың қалған функциялары жұмыс істейді.",
  "mentor.practice": "Қайталауды ұсынамыз",
  "mentor.placeholder": "Сабақ тақырыбы бойынша сұрақ қойыңыз…",
  "mentor.send": "Жіберу",
  "mentor.thinking": "Тәлімгер ойланып жатыр…",
  "mentor.error": "Жауап алу мүмкін болмады. Кейінірек қайталап көріңіз.",
  "mentor.note": "ЖИ жауаптарында қателер болуы мүмкін. Маңыздысын тексеріңіз.",
  "mentor.mode.explain_simple": "Қарапайым түсіндіру",
  "mentor.mode.example": "Мысал келтіру",
  "mentor.mode.hint": "Кеңес",
  "mentor.mode.ask_question": "Маған сұрақ қой",
  "mentor.mode.explain_error": "Қатені талдау",
  "mentor.mode.suggest_practice": "Жаттығу ұсыну",
};
