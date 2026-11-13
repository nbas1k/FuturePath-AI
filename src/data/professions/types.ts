import type { DirectionId } from "../directions";
import type { CategoryId, SubjectArea } from "../categories";

// Уровень подготовки: как обычно получают эту профессию (ориентир, не требование конкретного вуза)
export type Level = "college" | "bachelor" | "practice" | "master";

export const LEVEL_LABELS: Record<Level, string> = {
  college: "Колледж или курсы",
  bachelor: "Бакалавриат (университет)",
  practice: "Бакалавриат и практика, сертификаты",
  master: "Магистратура или исследовательская подготовка",
};

// Сложность подготовки для сравнения (1 — проще, 3 — сложнее)
export const LEVEL_DIFFICULTY: Record<Level, number> = { college: 1, bachelor: 2, practice: 2, master: 3 };

export type Profession = {
  id: string; // уникальный латиницей, не меняйте у существующих (на них ссылаются страницы и избранное)
  title: string;
  category: CategoryId;
  // Связь с 6 базовыми направлениями теста. Если пусто — берутся направления категории (CATEGORY_DIRECTIONS).
  directions?: Partial<Record<DirectionId, number>>;
  description: string;
  tasks: string[]; // основные обязанности
  skills: string[]; // 5–10 навыков
  level: Level;
  subjects: SubjectArea[]; // школьные области, которые важны для профессии
  study: string[]; // возможные направления обучения
  projects: string[]; // примеры практических проектов
  aiImpact: string; // как ИИ меняет профессию (качественно, без цифр)
  aiAutomates: string[]; // что ИИ может автоматизировать
  humanSkills: string[]; // что останется важным для человека
  growth: string[]; // возможности карьерного роста
};
