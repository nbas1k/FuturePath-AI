// Контекст каталога для текущего пользователя: его результат, совпадения и любимые категории.
import type { Result } from "@/recommendation-engine";
import type { CatalogContext } from "@/data/catalogQuery";
import type { CategoryId } from "@/data/categories";
import { getProfile } from "./profile";
import { getLatestState } from "./results";

export type UserResult = { status: "none" } | { status: "outdated"; version: number } | { status: "ok"; version: number; result: Result };

export async function loadUserResult(): Promise<UserResult> {
  const profile = await getProfile();
  if (!profile) return { status: "none" };
  const state = await getLatestState(profile.id);
  if (state.status === "ok") return { status: "ok", version: state.version, result: state.result };
  if (state.status === "outdated") return { status: "outdated", version: state.version };
  return { status: "none" };
}

// Превращает результат в контекст каталога: совпадения и три категории, которые больше всего подходят по интересам
export function contextFromResult(u: UserResult): CatalogContext {
  if (u.status !== "ok") return {};
  const matches: Record<string, number> = {};
  for (const m of u.result.professions) matches[m.profession.id] = m.percent;
  const myCategories: CategoryId[] = u.result.hasInterests
    ? [...u.result.categories]
        .filter((c) => c.percent > 0)
        .sort((a, b) => b.percent - a.percent || a.name.localeCompare(b.name, "ru"))
        .slice(0, 3)
        .map((c) => c.id)
    : [];
  return { matches, myCategories };
}
