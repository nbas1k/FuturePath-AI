// Portfolio Builder: проверка введённых проектов. Чистая логика.
export type PortfolioInput = { title: string; description: string; skills: string[]; link: string | null };

export function validatePortfolio(raw: unknown): { ok: true; value: PortfolioInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Пустой запрос" };
  const o = raw as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const description = typeof o.description === "string" ? o.description.trim() : "";
  if (title.length < 3 || title.length > 80) return { ok: false, error: "Название: от 3 до 80 символов" };
  if (description.length < 10 || description.length > 500) return { ok: false, error: "Описание: от 10 до 500 символов" };

  let skills: string[] = [];
  if (o.skills !== undefined) {
    if (!Array.isArray(o.skills)) return { ok: false, error: "Навыки: нужен список" };
    skills = [...new Set(o.skills.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean))];
    if (skills.length > 6) return { ok: false, error: "Навыков не больше 6" };
    if (skills.some((s) => s.length > 40)) return { ok: false, error: "Название навыка не длиннее 40 символов" };
  }

  let link: string | null = null;
  if (typeof o.link === "string" && o.link.trim()) {
    const l = o.link.trim();
    // Только обычные веб-ссылки: javascript: и другие схемы запрещены
    if (l.length > 200 || !/^https?:\/\/[^\s]+$/i.test(l)) return { ok: false, error: "Ссылка должна начинаться с http:// или https://" };
    link = l;
  }
  return { ok: true, value: { title, description, skills, link } };
}
