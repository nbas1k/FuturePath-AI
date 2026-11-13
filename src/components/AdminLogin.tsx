"use client";
import { useState } from "react";

export function AdminLogin() {
  const [secret, setSecret] = useState("");
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const r = await fetch("/api/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "login", secret }) });
    if (r.ok) location.reload(); else setErr((await r.json().catch(() => ({}))).error ?? "Ошибка входа");
  }
  return (
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-extrabold">Вход в админ-панель</h1>
      <label className="block space-y-1"><span className="text-sm font-bold">Секрет доступа</span><input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" className="min-h-[48px] w-full rounded-2xl border-2 border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900" /></label>
      {err && <p role="alert" className="text-sm font-semibold text-red-700">{err}</p>}
      <button className="btn-primary w-full" disabled={!secret}>Войти</button>
    </form>
  );
}
