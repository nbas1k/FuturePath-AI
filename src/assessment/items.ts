// Банк вопросов диагностики v3. Чистые данные, без логики.
// Блоки: интересы (RIASEC), условия работы, ситуации, мини-задания (продемонстрированные навыки), самооценка.
// Тексты: ru и en полностью; kk пока берётся из ru (явный fallback, см. itemText).

export const LETTERS = ["R", "I", "A", "S", "E", "C"] as const;
export type Letter = (typeof LETTERS)[number];

export const CONDITIONS = ["people", "field", "variety", "autonomy", "pace"] as const;
export type Condition = (typeof CONDITIONS)[number];

export const SKILL_DIMS = ["numeric", "logic", "verbal", "people", "tech", "creative", "organize", "handson", "research"] as const;
export type SkillDim = (typeof SKILL_DIMS)[number];
// Навыки, которые можно проверить заданием. Остальные оцениваются только самооценкой.
export const DEMONSTRABLE = ["numeric", "logic", "verbal"] as const;

export type Text = { ru: string; en: string; kk?: string };
export type Lang = "ru" | "kk" | "en";
export const itemText = (t: Text, lang: Lang): string => (lang === "kk" ? t.kk ?? t.ru : t[lang]);

export type Block = "interest" | "condition" | "situation" | "challenge" | "self";

export type LikertItem = { id: string; block: "interest" | "condition" | "self"; pack: "core" | "refine"; text: Text; letter?: Letter; condition?: Condition; skill?: SkillDim };
export type ChoiceItem = { id: string; block: "situation" | "challenge"; pack: "core"; text: Text; context?: Text; options: { text: Text; letter?: Letter }[]; correct?: number; skill?: SkillDim };
export type Item = LikertItem | ChoiceItem;

const L = (id: string, letter: Letter, ru: string, en: string, pack: "core" | "refine" = "core"): LikertItem => ({ id, block: "interest", pack, letter, text: { ru, en } });

export const INTEREST_ITEMS: LikertItem[] = [
  L("i-R1", "R", "Чинить или собирать что-то своими руками", "Fix or build things with my hands"),
  L("i-I1", "I", "Разбираться в причинах явлений и проводить эксперименты", "Investigate why things happen and run experiments"),
  L("i-A1", "A", "Рисовать, проектировать или придумывать оформление", "Draw, design or create visuals"),
  L("i-S1", "S", "Помогать людям решать их проблемы", "Help people solve their problems"),
  L("i-E1", "E", "Организовывать проект и вести за собой людей", "Organize a project and lead people"),
  L("i-C1", "C", "Наводить порядок в документах, таблицах и данных", "Keep documents, spreadsheets and data in order"),
  L("i-R2", "R", "Работать с инструментами, техникой или оборудованием", "Work with tools, machines or equipment"),
  L("i-I2", "I", "Решать сложные логические или математические задачи", "Solve hard logic or math problems"),
  L("i-A2", "A", "Писать тексты, истории или сценарии", "Write texts, stories or scripts"),
  L("i-S2", "S", "Объяснять и учить других", "Explain things and teach others"),
  L("i-E2", "E", "Убеждать, договариваться, предлагать идеи", "Persuade, negotiate and pitch ideas"),
  L("i-C2", "C", "Работать по чётким правилам и инструкциям", "Work by clear rules and procedures"),
  L("i-R3", "R", "Работать на открытом воздухе или на объекте", "Work outdoors or on a site"),
  L("i-I3", "I", "Читать научные статьи и узнавать, как устроен мир", "Read scientific articles and learn how the world works"),
  L("i-A3", "A", "Снимать видео, фотографировать, монтировать", "Shoot, photograph or edit video"),
  L("i-S3", "S", "Выслушивать и поддерживать человека в трудной ситуации", "Listen to and support someone in a hard situation"),
  L("i-E3", "E", "Запускать собственное дело или инициативу", "Start my own business or initiative"),
  L("i-C3", "C", "Вести учёт, считать бюджет, проверять точность", "Track records, manage budgets, check accuracy"),
  L("i-R4", "R", "Выращивать растения или ухаживать за животными", "Grow plants or care for animals"),
  L("i-I4", "I", "Анализировать данные и искать в них закономерности", "Analyze data and look for patterns"),
  L("i-A4", "A", "Придумывать нестандартные идеи", "Come up with unconventional ideas"),
  L("i-S4", "S", "Работать в команде, где важно сотрудничество", "Work in a team where cooperation matters"),
  L("i-E4", "E", "Принимать решения в ситуации риска", "Make decisions under risk"),
  L("i-C4", "C", "Планировать работу по шагам и графику", "Plan work step by step on a schedule"),
  L("i-R5", "R", "Разбираться, как устроены механизмы", "Figure out how mechanisms work"),
  L("i-I5", "I", "Строить гипотезы и проверять их", "Form hypotheses and test them"),
  L("i-A5", "A", "Заниматься музыкой, театром или другим творчеством", "Do music, theatre or other creative work"),
  L("i-S5", "S", "Заботиться о здоровье и благополучии людей", "Look after people's health and wellbeing"),
  L("i-E5", "E", "Выступать публично и представлять результаты", "Speak in public and present results"),
  L("i-C5", "C", "Доводить мелкие детали до точного результата", "Get small details exactly right"),
];

// Пакет «уточнить рекомендации»: по две дополнительные формулировки на каждый тип.
export const REFINE_ITEMS: LikertItem[] = [
  L("r-R1", "R", "Водить транспорт или управлять техникой", "Drive vehicles or operate machinery", "refine"),
  L("r-R2", "R", "Работать на производстве или в мастерской", "Work in a workshop or factory", "refine"),
  L("r-I1", "I", "Моделировать и программировать системы", "Model and program systems", "refine"),
  L("r-I2", "I", "Изучать живые организмы, химию или физику", "Study living organisms, chemistry or physics", "refine"),
  L("r-A1", "A", "Придумывать дизайн интерфейсов, одежды или интерьеров", "Design interfaces, clothing or interiors", "refine"),
  L("r-A2", "A", "Создавать контент для людей: видео, подкасты, блоги", "Create content for people: video, podcasts, blogs", "refine"),
  L("r-S1", "S", "Консультировать и сопровождать людей", "Advise and guide people", "refine"),
  L("r-S2", "S", "Работать с детьми или подростками", "Work with children or teenagers", "refine"),
  L("r-E1", "E", "Искать на рынке возможности для роста", "Look for growth opportunities in a market", "refine"),
  L("r-E2", "E", "Вести переговоры с клиентами и партнёрами", "Negotiate with clients and partners", "refine"),
  L("r-C1", "C", "Проверять документы на соответствие нормам", "Check documents against standards", "refine"),
  L("r-C2", "C", "Работать с финансовыми отчётами и налогами", "Work with financial reports and taxes", "refine"),
];

const cond = (id: string, condition: Condition, ru: string, en: string): LikertItem => ({ id, block: "condition", pack: "core", condition, text: { ru, en } });
export const CONDITION_ITEMS: LikertItem[] = [
  cond("c-people", "people", "Я хочу, чтобы в работе было много общения с людьми", "I want a lot of contact with people at work"),
  cond("c-field", "field", "Я хочу работать не за столом, а на выезде, на объекте или в движении", "I want to work away from a desk: on site, in the field or on the move"),
  cond("c-variety", "variety", "Я хочу, чтобы задачи постоянно менялись, а не повторялись", "I want my tasks to keep changing rather than repeat"),
  cond("c-autonomy", "autonomy", "Я хочу сам решать, как организовать свою работу", "I want to decide for myself how to organize my work"),
  cond("c-pace", "pace", "Мне нравится быстрый темп и срочные задачи", "I like a fast pace and urgent tasks"),
];

const S = (id: string, ru: string, en: string, opts: [Letter, string, string][]): ChoiceItem => ({
  id, block: "situation", pack: "core", text: { ru, en }, options: opts.map(([letter, r, e]) => ({ letter, text: { ru: r, en: e } })),
});
export const SITUATION_ITEMS: ChoiceItem[] = [
  S("s-1", "Команде нужно за неделю сделать школьную выставку. Что вы возьмёте на себя?", "Your team must build a school exhibition within a week. What do you take on?", [
    ["R", "Построю стенды и всё техническое", "Build the stands and handle the technical side"],
    ["A", "Придумаю идею и оформление", "Come up with the concept and visual design"],
    ["E", "Распределю роли и буду отвечать за результат", "Assign roles and be accountable for the outcome"],
    ["S", "Помогу участникам и объясню им задачи", "Help the participants and explain their tasks"],
  ]),
  S("s-2", "В новом проекте всё идёт не по плану. Что вы сделаете в первую очередь?", "A new project is going off the rails. What do you do first?", [
    ["I", "Выясню причины и соберу данные", "Find the causes and gather data"],
    ["C", "Составлю чёткий план исправления по шагам", "Write a clear step-by-step recovery plan"],
    ["S", "Поговорю с командой и узнаю, кому нужна помощь", "Talk to the team and find who needs help"],
    ["E", "Предложу новое решение и убежу всех его попробовать", "Propose a new approach and convince everyone to try it"],
  ]),
  S("s-3", "Вам дали свободный день на любой проект. Что выберете?", "You get a free day for any project. What do you pick?", [
    ["R", "Соберу рабочую модель устройства", "Build a working model of a device"],
    ["A", "Сниму ролик или нарисую серию иллюстраций", "Shoot a short video or draw a series of illustrations"],
    ["I", "Проведу небольшое исследование по интересной теме", "Run a small study on a topic I find interesting"],
    ["C", "Наведу порядок и систему в своих материалах", "Put my materials into a clear system"],
  ]),
  S("s-4", "К вам пришёл человек с жалобой на сервис. Что вы сделаете?", "Someone comes to you with a complaint about a service. What do you do?", [
    ["S", "Выслушаю и постараюсь понять, что человек чувствует", "Listen and try to understand how the person feels"],
    ["C", "Проверю, что говорят правила и документы", "Check what the rules and documents say"],
    ["E", "Предложу вариант, который устроит обе стороны", "Offer an option that works for both sides"],
    ["I", "Проанализирую, почему так произошло", "Analyze why it happened"],
  ]),
];

const C = (id: string, skill: SkillDim, correct: number, ru: string, en: string, opts: [string, string][], ctx?: [string, string]): ChoiceItem => ({
  id, block: "challenge", pack: "core", skill, correct, text: { ru, en }, ...(ctx ? { context: { ru: ctx[0], en: ctx[1] } } : {}),
  options: opts.map(([r, e]) => ({ text: { ru: r, en: e } })),
});
export const CHALLENGE_ITEMS: ChoiceItem[] = [
  C("t-num1", "numeric", 1, "Последовательность: 3, 6, 12, 24, … Какое число следующее?", "Sequence: 3, 6, 12, 24, … What comes next?", [["36", "36"], ["48", "48"], ["30", "30"], ["42", "42"]]),
  C("t-num2", "numeric", 0, "Товар стоит 2500 тг, скидка 20%. Сколько он стоит со скидкой?", "An item costs 2500 and has a 20% discount. What is the price after the discount?", [["2000 тг", "2000"], ["2200 тг", "2200"], ["1800 тг", "1800"], ["2300 тг", "2300"]]),
  C("t-log1", "logic", 1, "Все дизайнеры в команде умеют рисовать. Айдар умеет рисовать. Что из этого следует?", "Every designer on the team can draw. Aidar can draw. What follows?", [
    ["Айдар точно дизайнер", "Aidar is definitely a designer"],
    ["Не обязательно: из условия это не следует", "Not necessarily: the statement does not imply it"],
    ["Айдар точно не дизайнер", "Aidar is definitely not a designer"],
    ["В команде никто не умеет рисовать", "Nobody on the team can draw"],
  ]),
  C("t-log2", "logic", 2, "Тест идёт после разработки, а разработка идёт после проекта. Что выполняется последним?", "Testing comes after development, and development comes after design. What is done last?", [
    ["Проект", "Design"], ["Разработка", "Development"], ["Тест", "Testing"], ["Нельзя определить", "Cannot be determined"],
  ]),
  C("t-ver1", "verbal", 0, "Что следует из текста?", "What follows from the text?", [
    ["Приём перенесён на четверг из-за ремонта", "The appointment moved to Thursday because of renovation"],
    ["Клинику закрыли навсегда", "The clinic closed for good"],
    ["Приём отменён без переноса", "The appointment was cancelled with no new date"],
    ["Пациенты должны позвонить сами во вторник", "Patients must call on Tuesday themselves"],
  ], ["Клиника перенесла приём со вторника на четверг из-за ремонта кабинета. Записанные на вторник пациенты получат сообщение.", "The clinic moved appointments from Tuesday to Thursday because of room renovation. Patients booked for Tuesday will receive a message."]),
  C("t-ver2", "verbal", 1, "Какой вариант точнее передаёт главную мысль?", "Which option best states the main idea?", [
    ["Роботы заменят всех людей", "Robots will replace all people"],
    ["Из-за автоматизации важнее становятся решения и общение с клиентом", "Because of automation, decisions and client communication become more important"],
    ["Рутинные операции исчезнут навсегда", "Routine operations will disappear for good"],
    ["Клиенты больше не нужны", "Clients are no longer needed"],
  ], ["Автоматизация берёт на себя рутинные операции, поэтому ценность человека смещается к принятию решений и общению с клиентом.", "Automation takes over routine operations, so human value shifts toward decision-making and client communication."]),
];

const sf = (id: string, skill: SkillDim, ru: string, en: string): LikertItem => ({ id, block: "self", pack: "core", skill, text: { ru, en } });
export const SELF_ITEMS: LikertItem[] = [
  sf("a-numeric", "numeric", "Мне легко работать с числами и расчётами", "I find numbers and calculations easy"),
  sf("a-verbal", "verbal", "Я хорошо излагаю мысли устно и письменно", "I express my thoughts well in speech and writing"),
  sf("a-people", "people", "Мне легко находить общий язык с разными людьми", "I find it easy to get along with different people"),
  sf("a-tech", "tech", "Я уверенно пользуюсь компьютером и осваиваю новые программы", "I am confident with computers and learn new software quickly"),
  sf("a-creative", "creative", "Я часто придумываю новые идеи и решения", "I often come up with new ideas and solutions"),
  sf("a-organize", "organize", "Я умею планировать и доводить дела до конца", "I can plan and finish what I start"),
  sf("a-handson", "handson", "У меня хорошо получается работа руками и с техникой", "I am good at hands-on work and with equipment"),
  sf("a-research", "research", "Мне нравится искать информацию и проверять факты", "I enjoy looking up information and checking facts"),
];

export const CORE_ITEMS: Item[] = [...INTEREST_ITEMS, ...CONDITION_ITEMS, ...SITUATION_ITEMS, ...CHALLENGE_ITEMS, ...SELF_ITEMS];
export const ALL_ITEMS: Item[] = [...CORE_ITEMS, ...REFINE_ITEMS];
export const ITEM_BY_ID = new Map<string, Item>(ALL_ITEMS.map((i) => [i.id, i]));

export const ASSESSMENT_VERSION = 3;

// Порядок показа: перемешивание типов интересов (чтобы подряд не шли однотипные), затем остальные блоки.
export function orderedItems(pack: "core" | "refine"): Item[] {
  return pack === "core" ? CORE_ITEMS : REFINE_ITEMS;
}

// Допустимое значение ответа. Likert: 1..5. Выбор: индекс варианта.
export function isValidAnswer(item: Item, value: number): boolean {
  if (!Number.isInteger(value)) return false;
  if (item.block === "situation" || item.block === "challenge") return value >= 0 && value < (item as ChoiceItem).options.length;
  return value >= 1 && value <= 5;
}
