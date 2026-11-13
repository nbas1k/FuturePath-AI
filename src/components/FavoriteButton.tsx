"use client";
import { useFavorites } from "./useFavorites";

// Кнопка «в избранное» для одной профессии (на странице профессии)
export function FavoriteButton({ id }: { id: string }) {
  const { ids, toggle } = useFavorites();
  const on = ids.includes(id);
  return (
    <button onClick={() => toggle(id)} aria-pressed={on} className={on ? "btn-primary" : "btn-ghost"}>
      {on ? "★ В избранном" : "☆ В избранное"}
    </button>
  );
}
