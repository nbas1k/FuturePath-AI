// Модуль рекомендаций. Чистые функции без базы данных и без ИИ:
// одинаковые ответы и одна версия теста всегда дают одинаковый результат. Случайности нет.
//
// Что считается:
//  1) Направления (6 штук): баллы за ответы на вопросы 1–18 (версии 1 и 2).
//  2) Категории (18 штук): баллы за ответы на вопросы 19–24 (только версия 2 — «интересы»).
//  3) Совпадение с профессией = взвешенная сумма трёх частей:
//       интересы (категория профессии)          — 45%  (в версии 1 интересов нет, тогда 0%)
//       направления (связь профессии с 6 направлениями) — 35% (версия 2) / 60% (версия 1)
//       школьный предмет (нужен ли он профессии)       — 20% (версия 2) / 40% (версия 1)
// Это ОРИЕНТИР для размышления, а не оценка способностей и не вероятность успеха.
import { DIRECTIONS, type DirectionId } from "@/data/directions";
import { CATEGORIES, categoryName, subjectAreaName, type CategoryId, type SubjectArea } from "@/data/categories";
import { PROFESSIONS, effectiveDirections, type Profession } from "@/data/professions";
import { CURRENT_TEST_VERSION, questionsFor, type Question } from "@/data/questions";

export type Answers = Record<string, string>; // { questionId: optionId }

export type Contribution = { questionId: string; questionText: string; optionText: string; points: number };
export type DirectionResult = {
  id: DirectionId;
  name: string;
  score: number; // сырые баллы
  max: number; // максимум, который можно набрать
  percent: number; // 0..100, целое
  contributions: Contribution[]; // какие ответы дали баллы (по убыванию)
};
export type CategoryResult = { id: CategoryId; name: string; score: number; max: number; percent: number };

export type ProfessionMatch = {
  profession: Profession;
  percent: number; // итоговое совпадение 0..100 (ориентир)
  parts: {
    interest: number | null; // null — интересы не оценивались (версия 1)
    direction: number; // 0..100
    requirement: number; // 0 или 100: нужен ли выбранный предмет профессии
  };
  reasons: string[]; // понятные причины, которые видит пользователь
};

export type Result = {
  version: number;
  hasInterests: boolean;
  directions: DirectionResult[]; // отсортировано по убыванию
  top: DirectionResult[]; // топ-3 направления
  categories: CategoryResult[]; // 18 категорий (пусто в версии 1)
  subjectArea: SubjectArea | null; // выбранный школьный предмет
  professions: ProfessionMatch[]; // все профессии, отсортированы по убыванию
};

// Проверяет ответы на текущих (или переданных) вопросах. Возвращает первую проблему.
export function findProblem(answers: Answers, questions: Question[] = QUESTIONS_CURRENT()): { questionId: string; message: string } | null {
  for (const q of questions) {
    const a = answers[q.id];
    if (!a) return { questionId: q.id, message: `Нет ответа на вопрос ${q.id}` };
    if (!q.options.some((o) => o.id === a)) return { questionId: q.id, message: `Неизвестный вариант в вопросе ${q.id}` };
  }
  return null;
}

export function validateAnswers(answers: Answers, questions: Question[] = QUESTIONS_CURRENT()): string | null {
  return findProblem(answers, questions)?.message ?? null;
}

// Оставляет только ответы, которые подходят выбранным вопросам (для черновика из localStorage)
export function sanitizeAnswers(raw: unknown, questions: Question[] = QUESTIONS_CURRENT()): { answers: Answers; dropped: number } {
  const input: Record<string, unknown> = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const answers: Answers = {};
  let dropped = 0;
  for (const key of Object.keys(input)) {
    const q = questions.find((x) => x.id === key);
    const value = input[key];
    if (q && typeof value === "string" && q.options.some((o) => o.id === value)) answers[key] = value;
    else dropped++;
  }
  return { answers, dropped };
}

// Максимум баллов направления = сумма лучших вариантов по каждому вопросу
export function maxScore(dir: DirectionId, questions: Question[] = QUESTIONS_CURRENT()): number {
  return questions.reduce((sum, q) => sum + Math.max(0, ...q.options.map((o) => o.scores[dir] ?? 0)), 0);
}

// Максимум баллов категории (только вопросы, где она упоминается)
function maxCategory(cat: CategoryId, questions: Question[]): number {
  return questions.reduce((sum, q) => sum + Math.max(0, ...q.options.map((o) => o.categories?.[cat] ?? 0)), 0);
}

function QUESTIONS_CURRENT(): Question[] {
  return questionsFor(CURRENT_TEST_VERSION) ?? [];
}

const pct = (score: number, max: number) => (max ? Math.round((score / max) * 100) : 0);

// Считает результат. version — версия теста, по которой проходили (нужна для старых результатов).
export function calculate(answers: Answers, version: number = CURRENT_TEST_VERSION): Result {
  const questions = questionsFor(version) ?? QUESTIONS_CURRENT();
  const hasInterests = version >= 2;

  // 1) Направления
  const directions: DirectionResult[] = DIRECTIONS.map((d) => {
    let score = 0;
    const contributions: Contribution[] = [];
    for (const q of questions) {
      const opt = q.options.find((o) => o.id === answers[q.id]);
      const points = opt?.scores[d.id] ?? 0;
      if (opt && points > 0) {
        score += points;
        contributions.push({ questionId: q.id, questionText: q.text, optionText: opt.text, points });
      }
    }
    contributions.sort((a, b) => b.points - a.points || a.questionId.localeCompare(b.questionId, "en", { numeric: true }));
    const max = maxScore(d.id, questions);
    return { id: d.id, name: d.name, score, max, percent: pct(score, max), contributions };
  });
  // Сортировка по доле от максимума; при равенстве — порядок в DIRECTIONS (sort стабилен)
  directions.sort((a, b) => b.score / (b.max || 1) - a.score / (a.max || 1));
  const dirPercent = new Map(directions.map((d) => [d.id, d.percent]));

  // 2) Категории (интересы)
  const categories: CategoryResult[] = hasInterests
    ? CATEGORIES.map((c) => {
        let score = 0;
        for (const q of questions) {
          const opt = q.options.find((o) => o.id === answers[q.id]);
          score += opt?.categories?.[c.id] ?? 0;
        }
        const max = maxCategory(c.id, questions);
        return { id: c.id, name: c.name, score, max, percent: pct(score, max) };
      })
    : [];
  const catPercent = new Map(categories.map((c) => [c.id, c.percent]));

  // 3) Школьный предмет (из вопроса о предмете)
  const subjectQuestion = questions.find((q) => q.id === "q2");
  const subjectOpt = subjectQuestion?.options.find((o) => o.id === answers["q2"]);
  const subjectArea = subjectOpt?.subjectArea ?? null;

  // 4) Совпадение с каждой профессией
  const professions: ProfessionMatch[] = PROFESSIONS.map((p) => {
    const dirs = effectiveDirections(p);
    let sum = 0;
    let weights = 0;
    for (const [dir, w] of Object.entries(dirs)) {
      sum += (dirPercent.get(dir as DirectionId) ?? 0) * (w ?? 0);
      weights += w ?? 0;
    }
    const direction = weights ? Math.round(sum / weights) : 0;
    const requirement = subjectArea && p.subjects.includes(subjectArea) ? 100 : 0;
    const interest = hasInterests ? catPercent.get(p.category) ?? 0 : null;

    const total = interest === null
      ? 0.6 * direction + 0.4 * requirement
      : 0.45 * interest + 0.35 * direction + 0.2 * requirement;

    const reasons: string[] = [];
    if (interest !== null) reasons.push(`Интерес к категории «${categoryName(p.category)}»: ${interest}%`);
    else reasons.push("Интересы не оценивались: пройдите обновлённый тест, чтобы учесть категории профессий.");
    const dirText = Object.keys(dirs)
      .map((d) => `${DIRECTIONS.find((x) => x.id === d)?.name ?? d} ${dirPercent.get(d as DirectionId) ?? 0}%`)
      .join(", ");
    reasons.push(`Связь с направлениями (${dirText}): ${direction}%`);
    if (subjectArea) {
      reasons.push(
        requirement === 100
          ? `Предмет «${subjectAreaName(subjectArea)}» нужен для этой профессии`
          : `Предмет «${subjectAreaName(subjectArea)}» не входит в основные для этой профессии`,
      );
    }

    return {
      profession: p,
      percent: Math.round(total),
      parts: { interest, direction, requirement },
      reasons,
    };
  }).sort((a, b) => b.percent - a.percent || a.profession.title.localeCompare(b.profession.title, "ru"));

  return { version, hasInterests, directions, top: directions.slice(0, 3), categories, subjectArea, professions };
}

// Текст-объяснение без ИИ: на какие ответы опирается топ-направление
export function explainTop(result: Result): string[] {
  return result.top.map((d) => {
    const why = d.contributions.slice(0, 3).map((c) => `«${c.optionText}» (вопрос ${c.questionId.replace("q", "")}, +${c.points})`);
    return `${d.name}: ${d.score} из ${d.max} баллов (${d.percent}%). Больше всего повлияли ответы: ${why.join("; ") || "—"}.`;
  });
}

// Фильтр рекомендаций: профессии, у которых совпадение выше порога
export function recommend(result: Result, minPercent = 0, limit = 10): ProfessionMatch[] {
  return result.professions.filter((m) => m.percent >= minPercent).slice(0, limit);
}

// Разнообразный список для показа: сначала лучшие, но не больше perCategory профессий из одной категории.
// Нужен потому, что профессии одной категории часто получают одинаковый процент.
export function recommendDiverse(result: Result, limit = 6, perCategory = 2): ProfessionMatch[] {
  const picked: ProfessionMatch[] = [];
  const count = new Map<string, number>();
  for (const m of result.professions) {
    const c = count.get(m.profession.category) ?? 0;
    if (c >= perCategory) continue;
    count.set(m.profession.category, c + 1);
    picked.push(m);
    if (picked.length >= limit) break;
  }
  return picked;
}
