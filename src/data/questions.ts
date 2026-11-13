import type { DirectionId } from "./directions";
import type { CategoryId, SubjectArea } from "./categories";

// Один вариант ответа:
//  scores — баллы 6 базовых направлений (как раньше);
//  categories — баллы 18 категорий профессий (есть только у вопросов версии 2);
//  subjectArea — школьная область, которую выбрал пользователь (вопрос о предметах).
export type Option = {
  id: string;
  text: string;
  scores: Partial<Record<DirectionId, number>>;
  categories?: Partial<Record<CategoryId, number>>;
  subjectArea?: SubjectArea;
};
export type Question = { id: string; text: string; options: Option[] };

// Как изменить вопрос: поправьте text или баллы (обычно 2 — сильная связь, 1 — слабая).
// ВАЖНО: id вопросов и вариантов не меняйте у уже сохранённых ответов — они хранятся в базе.
// ВЕРСИИ ТЕСТА: версия 1 — первые 18 вопросов (старые результаты). Версия 2 — все 24 (добавлены интересы).
// Старые результаты остаются версии 1 и не пересчитываются по новым вопросам.

const QUESTIONS_V1: Question[] = [
  { id: "q1", text: "Какое занятие в свободное время тебе ближе всего?", options: [
    { id: "a", text: "Разбираться, как устроены программы, игры и сайты", scores: { it: 2, engineering: 1 } },
    { id: "b", text: "Рисовать, снимать, придумывать оформление", scores: { design: 2 } },
    { id: "c", text: "Организовывать дела друзей и проекты", scores: { business: 2, education: 1 } },
    { id: "d", text: "Помогать людям и узнавать, как работает организм", scores: { medicine: 2, education: 1 } },
  ]},
  { id: "q2", text: "Какой школьный предмет тебе интереснее?", options: [
    { id: "a", text: "Информатика, математика", scores: { it: 2, engineering: 1 }, subjectArea: "math_it" },
    { id: "b", text: "Физика, технология, черчение", scores: { engineering: 2, it: 1 }, subjectArea: "physics" },
    { id: "c", text: "Биология, химия", scores: { medicine: 2 }, subjectArea: "bio" },
    { id: "d", text: "Литература, история, языки", scores: { education: 2, design: 1 }, subjectArea: "humanities" },
  ]},
  { id: "q3", text: "Тебе дали групповой проект. Какую роль ты возьмёшь?", options: [
    { id: "a", text: "Сделаю техническую часть", scores: { it: 2, engineering: 1 } },
    { id: "b", text: "Продумаю внешний вид и подачу", scores: { design: 2, business: 1 } },
    { id: "c", text: "Распределю задачи и прослежу за сроками", scores: { business: 2 } },
    { id: "d", text: "Объясню другим, что и как делать", scores: { education: 2, medicine: 1 } },
  ]},
  { id: "q4", text: "Что тебя больше радует в результате работы?", options: [
    { id: "a", text: "Всё работает без ошибок", scores: { it: 2, engineering: 1 } },
    { id: "b", text: "Выглядит красиво и вызывает эмоции", scores: { design: 2 } },
    { id: "c", text: "Принесло выгоду и рост", scores: { business: 2 } },
    { id: "d", text: "Человеку стало лучше или понятнее", scores: { medicine: 1, education: 2 } },
  ]},
  { id: "q5", text: "Если что-то сломалось, ты...", options: [
    { id: "a", text: "Разберу и попробую починить сам", scores: { engineering: 2, it: 1 } },
    { id: "b", text: "Найду причину в логике и настройках", scores: { it: 2 } },
    { id: "c", text: "Найду, кто может помочь, и договорюсь", scores: { business: 2 } },
    { id: "d", text: "Подумаю, как сделать это удобнее и красивее", scores: { design: 2, engineering: 1 } },
  ]},
  { id: "q6", text: "Какая рабочая обстановка тебе подходит?", options: [
    { id: "a", text: "За компьютером, в тишине, над сложной задачей", scores: { it: 2, design: 1 } },
    { id: "b", text: "В мастерской, лаборатории или на объекте", scores: { engineering: 2, medicine: 1 } },
    { id: "c", text: "Среди людей, в постоянном общении", scores: { business: 1, education: 2, medicine: 1 } },
    { id: "d", text: "В студии, где можно творить", scores: { design: 2 } },
  ]},
  { id: "q7", text: "Как ты относишься к цифрам и таблицам?", options: [
    { id: "a", text: "Люблю искать в них закономерности", scores: { it: 2, business: 1 } },
    { id: "b", text: "Использую для расчётов и измерений", scores: { engineering: 2, medicine: 1 } },
    { id: "c", text: "Считаю деньги и выгоду", scores: { business: 2 } },
    { id: "d", text: "Предпочитаю работать с образами и словами", scores: { design: 1, education: 2 } },
  ]},
  { id: "q8", text: "Что бы ты скорее создал?", options: [
    { id: "a", text: "Приложение или сервис", scores: { it: 2, design: 1 } },
    { id: "b", text: "Постер, логотип или анимацию", scores: { design: 2 } },
    { id: "c", text: "Механизм, робота или здание", scores: { engineering: 2 } },
    { id: "d", text: "Свой стартап или клуб", scores: { business: 2, education: 1 } },
  ]},
  { id: "q9", text: "Как ты реагируешь на чужие трудности?", options: [
    { id: "a", text: "Стараюсь поддержать и помочь лично", scores: { medicine: 2, education: 1 } },
    { id: "b", text: "Придумываю, как автоматизировать решение", scores: { it: 2, engineering: 1 } },
    { id: "c", text: "Объясняю шаг за шагом, пока не поймут", scores: { education: 2 } },
    { id: "d", text: "Ищу, как на этом можно построить полезный проект", scores: { business: 2 } },
  ]},
  { id: "q10", text: "Что тебе проще дать окружающим?", options: [
    { id: "a", text: "Чёткую логику и решения", scores: { it: 2, engineering: 1 } },
    { id: "b", text: "Идею и вкус", scores: { design: 2 } },
    { id: "c", text: "Спокойствие и заботу", scores: { medicine: 2 } },
    { id: "d", text: "Мотивацию и энергию", scores: { business: 1, education: 2 } },
  ]},
  { id: "q11", text: "Тебе нужно выучить новую тему. Как ты это делаешь?", options: [
    { id: "a", text: "Практикуюсь на задачах и экспериментах", scores: { it: 1, engineering: 2 } },
    { id: "b", text: "Смотрю примеры и делаю собственный вариант", scores: { design: 2, it: 1 } },
    { id: "c", text: "Обсуждаю с другими и объясняю сам", scores: { education: 2, business: 1 } },
    { id: "d", text: "Читаю подробно и конспектирую", scores: { medicine: 2, education: 1 } },
  ]},
  { id: "q12", text: "Какой вызов тебе интереснее?", options: [
    { id: "a", text: "Написать программу, которая решает задачу", scores: { it: 2 } },
    { id: "b", text: "Спроектировать устройство или конструкцию", scores: { engineering: 2 } },
    { id: "c", text: "Придумать, как заработать на идее", scores: { business: 2 } },
    { id: "d", text: "Разобраться, почему человеку нездоровится", scores: { medicine: 2 } },
  ]},
  { id: "q13", text: "Что для тебя важнее в будущей работе?", options: [
    { id: "a", text: "Возможность создавать новое с нуля", scores: { it: 1, design: 2 } },
    { id: "b", text: "Реальная польза для здоровья людей", scores: { medicine: 2 } },
    { id: "c", text: "Карьера и собственное дело", scores: { business: 2 } },
    { id: "d", text: "Вклад в развитие других людей", scores: { education: 2 } },
  ]},
  { id: "q14", text: "Как ты относишься к рутине и точности?", options: [
    { id: "a", text: "Мне нравится аккуратность и точность в мелочах", scores: { engineering: 2, medicine: 1 } },
    { id: "b", text: "Рутину стараюсь автоматизировать", scores: { it: 2 } },
    { id: "c", text: "Мне важнее идея, чем детали", scores: { design: 1, business: 2 } },
    { id: "d", text: "Люблю, когда всё по плану и понятно людям", scores: { education: 2, medicine: 1 } },
  ]},
  { id: "q15", text: "Что бы ты выбрал для школьного мероприятия?", options: [
    { id: "a", text: "Настроить звук, свет и технику", scores: { engineering: 2, it: 1 } },
    { id: "b", text: "Сделать афишу и оформление", scores: { design: 2 } },
    { id: "c", text: "Организовать и найти спонсоров", scores: { business: 2 } },
    { id: "d", text: "Вести программу и работать с гостями", scores: { education: 2, business: 1 } },
  ]},
  { id: "q16", text: "Как ты относишься к искусственному интеллекту?", options: [
    { id: "a", text: "Хочу понимать, как он устроен, и создавать его", scores: { it: 2 } },
    { id: "b", text: "Хочу использовать его как инструмент творчества", scores: { design: 2, business: 1 } },
    { id: "c", text: "Интересно применять его в технике и науке", scores: { engineering: 2, medicine: 1 } },
    { id: "d", text: "Важно, чтобы он помогал людям учиться и лечиться", scores: { education: 1, medicine: 2 } },
  ]},
  { id: "q17", text: "Тебе предлагают стажировку. Куда пойдёшь?", options: [
    { id: "a", text: "В IT-компанию", scores: { it: 2 } },
    { id: "b", text: "В студию дизайна или медиа", scores: { design: 2 } },
    { id: "c", text: "На производство или в лабораторию", scores: { engineering: 2, medicine: 1 } },
    { id: "d", text: "В клинику, школу или центр развития", scores: { medicine: 1, education: 2 } },
  ]},
  { id: "q18", text: "Чем ты гордишься больше всего?", options: [
    { id: "a", text: "Решил сложную техническую задачу", scores: { it: 2, engineering: 1 } },
    { id: "b", text: "Сделал работу, которую хвалили за стиль", scores: { design: 2 } },
    { id: "c", text: "Собрал команду и довёл дело до результата", scores: { business: 2, education: 1 } },
    { id: "d", text: "Помог человеку в трудной ситуации", scores: { medicine: 2, education: 1 } },
  ]},
];

// Вопросы версии 2 — интересы. Они дают баллы 18 категориям профессий.
// Направления (scores) здесь пустые: интересы считаются отдельно.
const INTEREST_QUESTIONS: Question[] = [
  { id: "q19", text: "Какая задача тебя увлекает больше всего?", options: [
    { id: "a", text: "Писать программы, сайты и приложения", scores: {}, categories: { it: 2, ai_data: 1 } },
    { id: "b", text: "Учить компьютеры находить закономерности в данных", scores: {}, categories: { ai_data: 2, it: 1 } },
    { id: "c", text: "Защищать информацию от взлома", scores: {}, categories: { cyber: 2, it: 1 } },
    { id: "d", text: "Придумывать и собирать роботов и механизмы", scores: {}, categories: { engineering: 2, production: 1 } },
  ]},
  { id: "q20", text: "Какая сфера тебе интереснее?", options: [
    { id: "a", text: "Законы, правила и справедливость", scores: {}, categories: { law: 2, social: 1 } },
    { id: "b", text: "Деньги, финансы и экономика", scores: {}, categories: { finance: 2, business: 1 } },
    { id: "c", text: "Природа, экология и энергия", scores: {}, categories: { ecology: 2, agri: 1 } },
    { id: "d", text: "Растения, животные и поля", scores: {}, categories: { agri: 2, ecology: 1 } },
  ]},
  { id: "q21", text: "В каком пространстве тебе комфортнее работать?", options: [
    { id: "a", text: "В городе: здания, улицы, пространство", scores: {}, categories: { architecture: 2, engineering: 1 } },
    { id: "b", text: "В движении: дороги, грузы, маршруты", scores: {}, categories: { logistics: 2 } },
    { id: "c", text: "С путешественниками и гостями из других стран", scores: {}, categories: { tourism: 2, business: 1 } },
    { id: "d", text: "На производстве: цеха, станки, технологии", scores: {}, categories: { production: 2, engineering: 1 } },
  ]},
  { id: "q22", text: "Что тебе ближе в работе с информацией?", options: [
    { id: "a", text: "Снимать, монтировать и рассказывать истории", scores: {}, categories: { media: 2, design: 1 } },
    { id: "b", text: "Продвигать идеи и привлекать людей", scores: {}, categories: { media: 2, business: 1 } },
    { id: "c", text: "Объяснять сложное и обучать других", scores: {}, categories: { education: 2, social: 1 } },
    { id: "d", text: "Исследовать и открывать новое", scores: {}, categories: { education: 2, ai_data: 1 } },
  ]},
  { id: "q23", text: "С кем тебе интереснее всего работать?", options: [
    { id: "a", text: "Помогать людям, которые оказались в трудной ситуации", scores: {}, categories: { social: 2, medicine: 1 } },
    { id: "b", text: "Лечить и заботиться о здоровье", scores: {}, categories: { medicine: 2 } },
    { id: "c", text: "Вести переговоры, продавать и убеждать", scores: {}, categories: { business: 2, finance: 1 } },
    { id: "d", text: "Создавать красивые визуальные образы", scores: {}, categories: { design: 2, architecture: 1 } },
  ]},
  { id: "q24", text: "Какой результат своей работы порадует тебя больше?", options: [
    { id: "a", text: "Сложный продукт работает без сбоев", scores: {}, categories: { it: 1, engineering: 1 } },
    { id: "b", text: "Прочное здание, которым пользуются многие люди", scores: {}, categories: { architecture: 2 } },
    { id: "c", text: "Здоровье или жизнь человека стали лучше", scores: {}, categories: { medicine: 1, social: 1 } },
    { id: "d", text: "Текст, видео или проект получили отклик людей", scores: {}, categories: { media: 2, design: 1 } },
  ]},
];

// Версия 2 = все вопросы: старые 18 + интересы
const QUESTIONS_V2: Question[] = [...QUESTIONS_V1, ...INTEREST_QUESTIONS];

// Все версии теста. Результат хранит номер версии, по которой его проходили.
export const TEST_VERSIONS: Record<number, Question[]> = { 1: QUESTIONS_V1, 2: QUESTIONS_V2 };
export const CURRENT_TEST_VERSION = 2;
// Текущие вопросы (версия, которую сейчас проходит пользователь)
export const QUESTIONS: Question[] = QUESTIONS_V2;

export function questionsFor(version: number): Question[] | null {
  return TEST_VERSIONS[version] ?? null;
}
