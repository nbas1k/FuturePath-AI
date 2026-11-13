// Career Switch Navigator: сравнение навыков двух профессий. Чистая логика по данным каталога.
// Здесь нет прогноза успеха: только какие навыки совпадают, что нужно добавить и что уже подтверждено заданиями.

const stem = (w: string) => w.toLowerCase().replace(/ё/g, "е").slice(0, 5);
const keyWords = (s: string) => s.split(/[^A-Za-zА-Яа-яЁё0-9]+/).filter((w) => w.length >= 5).map(stem);

export type SwitchPlan = {
  same: string[]; // навыки целевой профессии, которые дословно есть и в текущей
  similar: { target: string; from: string }[]; // близкие по смыслу слов (по общему корню), требуют проверки человеком
  carried: string[]; // навыки целевой профессии, уже подтверждённые заданиями в текущей (по совпадению названия)
  toLearn: string[]; // что нужно добавить
  unusedFromCurrent: string[]; // навыки текущей профессии, которые в целевой не названы
};

export function planSwitch(fromSkills: string[], toSkills: string[], confirmedFrom: string[]): SwitchPlan {
  const same = toSkills.filter((s) => fromSkills.includes(s));
  const similar: SwitchPlan["similar"] = [];
  const rest: string[] = [];
  for (const t of toSkills) {
    if (same.includes(t)) continue;
    const tk = new Set(keyWords(t));
    const f = fromSkills.find((x) => !same.includes(x) && keyWords(x).some((k) => tk.has(k)));
    if (f) similar.push({ target: t, from: f });
    else rest.push(t);
  }
  const carried = same.filter((s) => confirmedFrom.includes(s));
  const covered = new Set([...same, ...similar.map((x) => x.target)]);
  return {
    same,
    similar,
    carried,
    toLearn: toSkills.filter((s) => !covered.has(s)),
    unusedFromCurrent: fromSkills.filter((s) => !toSkills.includes(s) && !similar.some((x) => x.from === s)),
  };
}
