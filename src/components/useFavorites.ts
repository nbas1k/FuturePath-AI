"use client";
import { useCallback, useEffect, useState } from "react";

// Избранные профессии хранятся в браузере (localStorage): это удобство для одного устройства, а не данные аккаунта.
const KEY = "fp_favorites";

export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (Array.isArray(saved)) setIds(saved.filter((x) => typeof x === "string"));
    } catch {
      // Испорченные данные игнорируем
    }
  }, []);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Если хранилище недоступно, список всё равно работает до перезагрузки
      }
      return next;
    });
  }, []);

  return { ids, toggle };
}
