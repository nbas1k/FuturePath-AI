// 18 категорий профессий. Чтобы добавить категорию, добавьте строку сюда и (при необходимости) вопросы в questions.ts.
import type { DirectionId } from "./directions";

export type CategoryId =
  | "it" | "ai_data" | "cyber" | "engineering" | "medicine" | "business" | "finance" | "design" | "media"
  | "education" | "law" | "architecture" | "logistics" | "ecology" | "agri" | "production" | "tourism" | "social" | "science";

export const CATEGORIES: { id: CategoryId; name: string }[] = [
  { id: "it", name: "IT и программирование" },
  { id: "ai_data", name: "Искусственный интеллект и Data Science" },
  { id: "cyber", name: "Кибербезопасность" },
  { id: "engineering", name: "Инженерия и робототехника" },
  { id: "medicine", name: "Медицина и здравоохранение" },
  { id: "business", name: "Бизнес и предпринимательство" },
  { id: "finance", name: "Финансы и экономика" },
  { id: "design", name: "Дизайн и творчество" },
  { id: "media", name: "Медиа и маркетинг" },
  { id: "education", name: "Образование и наука" },
  { id: "law", name: "Право и государственное управление" },
  { id: "architecture", name: "Архитектура и строительство" },
  { id: "logistics", name: "Логистика и транспорт" },
  { id: "ecology", name: "Экология и энергетика" },
  { id: "agri", name: "Сельское хозяйство и агротехнологии" },
  { id: "production", name: "Производство и промышленность" },
  { id: "tourism", name: "Туризм и гостиничный бизнес" },
  { id: "social", name: "Социальная работа и психология" },
  { id: "science", name: "Наука и исследования" },
];

export const categoryName = (id: CategoryId): string => CATEGORIES.find((c) => c.id === id)?.name ?? id;

// Направления по умолчанию для категории (связь с 6 базовыми направлениями теста).
// Профессия может задать свои веса, а если не задаёт — берутся эти.
export const CATEGORY_DIRECTIONS: Record<CategoryId, Partial<Record<DirectionId, number>>> = {
  it: { it: 1 },
  ai_data: { it: 1 },
  cyber: { it: 1, engineering: 0.5 },
  engineering: { engineering: 1, it: 0.5 },
  medicine: { medicine: 1 },
  business: { business: 1 },
  finance: { business: 1 },
  design: { design: 1 },
  media: { design: 1, business: 0.5 },
  education: { education: 1 },
  law: { education: 0.5, business: 0.5 },
  architecture: { engineering: 1, design: 0.5 },
  logistics: { business: 1, engineering: 0.5 },
  ecology: { engineering: 1 },
  agri: { engineering: 1, business: 0.5 },
  production: { engineering: 1 },
  tourism: { business: 1, education: 0.5 },
  social: { education: 1, medicine: 0.5 },
  science: { it: 0.5, engineering: 0.5, medicine: 0.5 },
};

// Области школьных предметов. Используются для проверки совпадения с требованиями профессии.
export type SubjectArea = "math_it" | "physics" | "bio" | "humanities" | "art" | "economics";

export const SUBJECT_AREAS: { id: SubjectArea; name: string; examples: string }[] = [
  { id: "math_it", name: "Математика и информатика", examples: "математика, информатика, алгебра" },
  { id: "physics", name: "Физика и технология", examples: "физика, технология, черчение, химия" },
  { id: "bio", name: "Биология и химия", examples: "биология, химия, природоведение" },
  { id: "humanities", name: "Гуманитарные", examples: "языки, литература, история, обществознание" },
  { id: "art", name: "Творческие", examples: "рисование, музыка, мировая художественная культура" },
  { id: "economics", name: "Экономика и право", examples: "экономика, право, обществознание" },
];

export const subjectAreaName = (id: SubjectArea): string => SUBJECT_AREAS.find((s) => s.id === id)?.name ?? id;
