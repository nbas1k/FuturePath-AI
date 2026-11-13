"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";

export function AccountForm({ email }: { email: string | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<"register" | "login">("register");
  const [em, setEm] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(body: object) {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setErr(j.error ?? t("acct.error"));
      router.push("/profile"); router.refresh();
    } catch { setErr(t("acct.error")); } finally { setBusy(false); }
  }

  if (email) {
    return (
      <div className="card space-y-4">
        <p className="font-bold">{t("acct.signedAs")}: <span className="text-indigo-700 dark:text-indigo-300">{email}</span></p>
        <button className="btn-ghost" disabled={busy} onClick={() => send({ action: "logout" })}>{t("acct.logout")}</button>
        {err && <p role="alert" className="text-sm font-semibold text-red-700">{err}</p>}
      </div>
    );
  }

  return (
    <form className="card space-y-4" onSubmit={(e) => { e.preventDefault(); void send({ action: mode, email: em, password: pw }); }}>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label={t("acct.title")}>
        {(["register", "login"] as const).map((m) => <button key={m} type="button" aria-pressed={mode === m} onClick={() => { setMode(m); setErr(""); }} className={`min-h-[44px] rounded-2xl border-2 font-bold ${mode === m ? "border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950" : "border-slate-200 dark:border-slate-700"}`}>{t(m === "register" ? "acct.register" : "acct.login")}</button>)}
      </div>
      <label className="block space-y-1"><span className="text-sm font-bold">{t("acct.email")}</span><input type="email" autoComplete="email" required value={em} onChange={(e) => setEm(e.target.value)} className="min-h-[48px] w-full rounded-2xl border-2 border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900" /></label>
      <label className="block space-y-1"><span className="text-sm font-bold">{t("acct.password")}</span><input type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} className="min-h-[48px] w-full rounded-2xl border-2 border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900" /></label>
      {mode === "register" && <p className="text-xs text-slate-500">{t("acct.keepNote")}</p>}
      {err && <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-300">{err}</p>}
      <button className="btn-primary w-full !text-base" disabled={busy || !em || pw.length < 8}>{t(mode === "register" ? "acct.register" : "acct.login")}</button>
    </form>
  );
}
