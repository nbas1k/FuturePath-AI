"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

// «Выбрать эту профессию»: сохраняет цель и сразу ведёт в AI Readiness (вкладка «Мой цикл»)
export function ChooseProfessionButton({ professionId, title, selected }: { professionId: string; title: string; selected: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function choose() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/journey/select", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ professionId }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || "Не получилось. Попробуйте ещё раз."); return; }
      router.push("/learn?tab=cycle");
    } catch {
      setError("Нет связи с сервером.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <button className="btn-primary w-full" disabled={busy} onClick={() => void choose()} aria-label={`${selected ? "Продолжить с этой профессией" : "Выбрать эту профессию"}: ${title}`}>
        {busy ? "Сохраняем…" : selected ? "Продолжить с этой профессией" : "Выбрать эту профессию"}
      </button>
      {error && <p className="text-xs text-red-600 dark:text-red-300" role="alert">{error}</p>}
    </div>
  );
}
