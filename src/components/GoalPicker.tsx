"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type GoalOption = { id: string; title: string; full: boolean };

// Выбор цели: профессия. Тест не нужен. Профессии с полным циклом подготовки показаны первыми.
export function GoalPicker({ options, current }: { options: GoalOption[]; current: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const full = options.filter((o) => o.full);
  const rest = options.filter((o) => !o.full);

  async function choose() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/journey/select", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ professionId: value }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || "Не получилось. Попробуйте ещё раз."); return; }
      router.refresh();
    } catch {
      setError("Нет связи с сервером. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium" htmlFor="goal-select">Профессия, к которой вы готовитесь</label>
      <select id="goal-select" value={value} onChange={(e) => setValue(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-900">
        <option value="" disabled>Выберите профессию</option>
        <optgroup label="Полный цикл подготовки: диагностика, обучение, ИИ, повторная проверка">
          {full.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
        </optgroup>
        <optgroup label="Остальные профессии: ограниченные возможности (мягкие навыки, карта навыков, сценарии, ресурсы, наставник)">
          {rest.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
        </optgroup>
      </select>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200" role="alert">{error}</p>}
      <button className="btn-primary" disabled={busy || !value || value === current} onClick={() => void choose()}>{busy ? "Сохраняем…" : current ? "Сменить цель" : "Выбрать эту цель"}</button>
      <p className="text-xs text-slate-500">Профориентационный тест для этого не нужен. Если хотите подобрать профессию под интересы, пройдите его на странице «Мой путь».</p>
    </div>
  );
}
