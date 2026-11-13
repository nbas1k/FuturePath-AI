export const progressRu = {
  "pr.empty": "Пройдите первый урок, и здесь появится ваш прогресс.",
  "pr.summary": "Сводка", "pr.level": "Уровень", "pr.nextLevel": "До следующего уровня",
  "pr.week": "Эта неделя (XP по дням)", "pr.dailyGoal": "Сегодня: {a} из {b} XP",
  "pr.skills": "Освоение навыков", "pr.skillsNote": "Считается по лучшим результатам проверенных заданий, а не по числу нажатий. Справа число заданий.",
  "pr.noSkills": "Пока нет проверенных заданий.", "pr.achievements": "Достижения",
  "pr.mistakes": "Повторение ошибок", "pr.noMistakes": "Неисправленных ошибок нет.",
} as const;
export type ProgressKey = keyof typeof progressRu;
export const progressEn: Record<ProgressKey, string> = {
  "pr.empty": "Complete your first lesson and your progress will appear here.",
  "pr.summary": "Summary", "pr.level": "Level", "pr.nextLevel": "To the next level",
  "pr.week": "This week (XP by day)", "pr.dailyGoal": "Today: {a} of {b} XP",
  "pr.skills": "Skill mastery", "pr.skillsNote": "Based on the best results of verified tasks, not on the number of clicks. The number on the right is the task count.",
  "pr.noSkills": "No verified tasks yet.", "pr.achievements": "Achievements",
  "pr.mistakes": "Review your mistakes", "pr.noMistakes": "No unresolved mistakes.",
};
// Қазақша: тіл иесі тексеруі қажет.
export const progressKk: Record<ProgressKey, string> = {
  "pr.empty": "Алғашқы сабақтан өтіңіз, прогресс осында пайда болады.",
  "pr.summary": "Жиынтық", "pr.level": "Деңгей", "pr.nextLevel": "Келесі деңгейге дейін",
  "pr.week": "Осы апта (күн сайынғы XP)", "pr.dailyGoal": "Бүгін: {b} XP-дің {a}-сі",
  "pr.skills": "Дағдыларды меңгеру", "pr.skillsNote": "Тексерілген тапсырмалардың үздік нәтижелері бойынша есептеледі, басу санымен емес. Оң жақта тапсырма саны.",
  "pr.noSkills": "Әзірге тексерілген тапсырма жоқ.", "pr.achievements": "Жетістіктер",
  "pr.mistakes": "Қателерді қайталау", "pr.noMistakes": "Түзетілмеген қате жоқ.",
};
