"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";

export function ResultActions() {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function restart() {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/assessment", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "restart" }) });
      if (!res.ok) throw new Error("restart");
      router.push("/assessment");
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t("res.restartHint")}</p>
      <button type="button" className="btn-ghost w-full sm:w-auto" disabled={busy} onClick={restart}>{t("as.restart")}</button>
      {error && <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-300">{t("as.error.save")}</p>}
    </div>
  );
}
