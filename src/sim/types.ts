// Симуляции «Один день в профессии». Описание сценариев — данные; оценку считает сервер по критериям.
// Материалы — учебный черновик. Это не реальные клинические, юридические или финансовые инструкции.
export type Credit = Record<string, number>; // критерий → вклад 0..1 (отрицательный — штраф)
export type Effects = Record<string, number>; // переменная состояния → изменение

export type PickOption = { text: string; credit?: Credit; effects?: Effects; feedback: string };
export type MultiOption = { text: string; reply: string; credit?: Credit }; // reply — что отвечает «пациент»/«клиент»

export type SimStep =
  | { id: string; kind: "pick"; prompt: string; options: PickOption[] }
  | { id: string; kind: "multi"; prompt: string; max: number; options: MultiOption[] }
  | { id: string; kind: "number"; prompt: string; unit?: string; expected: number; tolerance: number; credit: Credit; hint: string; feedbackOk: string; feedbackBad: string };

export type Criterion = { id: string; label: string; weight: number };

export type SimDef = {
  id: string;
  career: string; // id профессии каталога
  title: string;
  goal: string;
  scenario: string;
  criteria: Criterion[];
  steps: SimStep[];
  stateVars?: Record<string, number>; // начальные значения (деньги, репутация…)
  maxXp: number;
  disclaimer: string;
  drawing?: { scale: string; rooms: { name: string; w: number; h: number }[] }; // размеры на чертеже в см
};

export type CodeSimDef = {
  id: string;
  career: string;
  title: string;
  goal: string;
  scenario: string;
  starter: string; // начальный код в редакторе (JavaScript)
  fnName: string;
  tests: { args: unknown[]; expected: unknown; label: string }[];
  maxXp: number;
  disclaimer: string;
  hints: string[];
};

// Ход симуляции, хранится в БД (state)
export type SimState = { answers: Record<string, unknown>; vars: Record<string, number> };
export type SimReport = {
  score: number; // 0..1
  criteria: { id: string; label: string; score: number }[];
  strengths: string[];
  improvements: string[];
  vars: Record<string, number>;
};
