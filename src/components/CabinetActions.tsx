"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Действия в кабинете: сменить имя и удалить все данные профиля
export function CabinetActions({ name }: { name: string }) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [msg, setMsg] = useState("");

  async function save() {
    const res = await fetch("/api/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: value }) });
    const data = await res.json();
    setMsg(res.ok ? "Имя сохранено" : data.error);
    if (res.ok) router.refresh();
  }

  async function remove() {
    if (!confirm("Удалить профиль, результаты и прогресс? Это нельзя отменить.")) return;
    await fetch("/api/profile", { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input value={value} onChange={(e) => setValue(e.target.value)} maxLength={40} aria-label="Имя"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" />
        <button className="btn-primary" onClick={save}>Сохранить имя</button>
      </div>
      {msg && <p className="text-sm text-slate-500" role="status">{msg}</p>}
      <button className="btn-ghost !text-red-600" onClick={remove}>Удалить мои данные</button>
    </div>
  );
}
