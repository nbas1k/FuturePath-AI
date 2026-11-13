"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/client";

// Сохраняет выбранную профессию (существующий API) и ведёт в обучение.
export function ChooseCareer({ professionId }: { professionId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function choose() {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/journey/select", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ professionId }) });
      if (!res.ok) throw new Error("select");
      router.push("/learn?tab=cycle");
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" className="btn-primary w-full !text-base sm:w-auto" disabled={busy} onClick={choose}>{t("cat.choose")}</button>
      {error && <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-300">{t("common.saveError")}</p>}
    </div>
  );
}
