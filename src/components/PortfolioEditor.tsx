"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type PortfolioView = { id: string; title: string; description: string; skills: string[]; link: string | null; date: string };

export function PortfolioEditor({ items, skillOptions }: { items: PortfolioView[]; skillOptions: string[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function call(method: "POST" | "DELETE", body: unknown): Promise<boolean> {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/portfolio", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || "Не получилось. Попробуйте ещё раз."); return false; }
      router.refresh();
      return true;
    } catch {
      setError("Нет связи с сервером.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const toggle = (s: string) => setSkills((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : cur.length < 6 ? [...cur, s] : cur));
  const field = "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-900";

  return (
    <div className="space-y-5">
      <form className="card space-y-3 print:hidden" onSubmit={async (e) => { e.preventDefault(); if (await call("POST", { title, description, skills, link })) { setTitle(""); setDescription(""); setLink(""); setSkills([]); } }}>
        <h2 className="font-semibold">Добавить проект</h2>
        <label className="block text-sm">Название<input className={field} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} /></label>
        <label className="block text-sm">Что вы сделали (10–500 символов)<textarea className={field} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} /></label>
        <label className="block text-sm">Ссылка на проект (необязательно, http или https)<input className={field} value={link} onChange={(e) => setLink(e.target.value)} maxLength={200} /></label>
        {skillOptions.length > 0 && (
          <fieldset className="text-sm"><legend className="mb-1">Какие навыки использовали (до 6)</legend>
            <div className="flex flex-wrap gap-2">
              {skillOptions.map((s) => <button type="button" key={s} onClick={() => toggle(s)} aria-pressed={skills.includes(s)} className={skills.includes(s) ? "btn-primary !py-1 text-xs" : "btn-ghost !py-1 text-xs"}>{s}</button>)}
            </div>
          </fieldset>
        )}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200" role="alert">{error}</p>}
        <button className="btn-primary" disabled={busy}>{busy ? "Сохраняем…" : "Сохранить проект"}</button>
      </form>

      <section className="space-y-3">
        <h2 className="font-semibold">Мои проекты ({items.length})</h2>
        {items.length === 0 && <p className="card text-sm text-slate-500">Пока нет проектов. Добавьте учебный или личный проект: то, что вы действительно сделали.</p>}
        {items.map((it) => (
          <article key={it.id} className="card space-y-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold">{it.title}</h3>
              <button className="btn-ghost !py-1 text-xs print:hidden" disabled={busy} onClick={() => { if (confirm("Удалить проект из портфолио?")) void call("DELETE", { id: it.id }); }}>Удалить</button>
            </div>
            <p className="text-xs text-slate-500">{it.date}</p>
            <p className="text-sm">{it.description}</p>
            {it.skills.length > 0 && <p className="text-sm text-slate-600 dark:text-slate-400">Навыки: {it.skills.join(", ")}</p>}
            {it.link && <p className="break-all text-sm"><a className="text-indigo-600 underline dark:text-indigo-400" href={it.link} target="_blank" rel="noopener noreferrer nofollow">{it.link}</a></p>}
          </article>
        ))}
      </section>
    </div>
  );
}
