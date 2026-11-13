// Шесть направлений. Чтобы добавить новое — добавьте строку здесь
// и баллы в вопросах/профессиях (см. HOW_IT_WORKS_RU.md).
export type DirectionId = "it" | "design" | "engineering" | "business" | "medicine" | "education";

export const DIRECTIONS: { id: DirectionId; name: string; short: string }[] = [
  { id: "it", name: "IT", short: "Программы, данные, алгоритмы" },
  { id: "design", name: "Дизайн", short: "Визуальные и творческие решения" },
  { id: "engineering", name: "Инженерия", short: "Техника, конструкции, энергия" },
  { id: "business", name: "Бизнес", short: "Продукты, люди, деньги, рынок" },
  { id: "medicine", name: "Медицина", short: "Здоровье и забота о людях" },
  { id: "education", name: "Образование", short: "Обучение и развитие людей" },
];
