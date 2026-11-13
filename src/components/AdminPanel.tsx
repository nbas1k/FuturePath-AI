"use client";
import { useCallback, useEffect, useState } from "react";
import { CAREER_OPTIONS } from "./adminCareers";

type Mod = { id: string; trackId: string; status: string; expertReviewed: boolean; title: { ru: string }; lessons: { id: string; status: string; title: { ru: string }; _count: { exercises: number } }[] };
type Ex = { id: string; type: string; prompt: { ru: string }; explanation: { ru: string }; answerKey: unknown };
const STATUS = [["draft", "Черновик"], ["review", "На проверке"], ["published", "Опубликовано"]] as const;

export function AdminPanel() {
  const [mods, setMods] = useState<Mod[] | null>(null);
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [exs, setExs] = useState<Ex[]>([]);
  const [career, setCareer] = useState({ careerId: CAREER_OPTIONS[0]?.id ?? "", status: "published", titleKk: "", titleEn: "" });

  const load = useCallback(async () => { const r = await fetch("/api/admin"); if (r.ok) setMods((await r.json()).modules); else setMsg("Нет доступа"); }, []);
  useEffect(() => { void load(); }, [load]);

  async function act(body: object) {
    setMsg("");
    const r = await fetch("/api/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? "Сохранено" : j.error ?? "Ошибка");
    if (r.ok) await load();
  }
  async function openLesson(id: string) { setOpen(id); const r = await fetch(`/api/admin?lessonId=${encodeURIComponent(id)}`); if (r.ok) setExs((await r.json()).exercises); }

  const sel = (value: string, onChange: (v: string) => void, label: string) => (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="min-h-[40px] rounded-xl border-2 border-slate-200 bg-white px-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900">{STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
  );

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between"><h1 className="text-2xl font-extrabold">Админ-панель</h1><button className="btn-ghost" onClick={async () => { await act({ action: "logout" }); location.href = "/admin"; }}>Выйти</button></header>
      <p className="text-sm text-slate-600 dark:text-slate-400">Статусы: черновик → на проверке → опубликовано. Сразу публиковать черновик нельзя. ИИ статусы не меняет.</p>
      {msg && <p role="status" className="rounded-2xl bg-slate-100 p-3 text-sm font-bold dark:bg-slate-800">{msg}</p>}

      <section className="space-y-3" aria-labelledby="mod-h"><h2 id="mod-h" className="text-lg font-extrabold">Модули и уроки</h2>
        {mods?.map((m) => (
          <div key={m.id} className="card space-y-2">
            <div className="flex flex-wrap items-center gap-3"><p className="flex-1 font-extrabold">{m.title.ru} <span className="text-xs font-semibold text-slate-500">{m.trackId}</span></p>
              {sel(m.status, (v) => act({ action: "set_module", id: m.id, status: v }), `Статус модуля ${m.title.ru}`)}
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={m.expertReviewed} onChange={(e) => act({ action: "set_module", id: m.id, expertReviewed: e.target.checked })} />Проверено экспертом</label></div>
            <ul className="space-y-1">{m.lessons.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 text-sm"><button className="flex-1 text-left font-bold underline" onClick={() => openLesson(l.id)}>{l.title.ru} ({l._count.exercises})</button>{sel(l.status, (v) => act({ action: "set_lesson", id: l.id, status: v }), `Статус урока ${l.title.ru}`)}</li>
            ))}</ul>
            {m.lessons.some((l) => l.id === open) && exs.map((e) => <ExerciseEditor key={e.id} ex={e} onSave={(b) => act({ action: "set_exercise", id: e.id, ...b })} />)}
          </div>
        ))}
      </section>

      <section className="card space-y-3" aria-labelledby="car-h"><h2 id="car-h" className="text-lg font-extrabold">Профессии и переводы названий</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <select aria-label="Профессия" value={career.careerId} onChange={(e) => setCareer({ ...career, careerId: e.target.value })} className="min-h-[44px] rounded-xl border-2 border-slate-200 bg-white px-2 dark:border-slate-700 dark:bg-slate-900">{CAREER_OPTIONS.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
          {sel(career.status, (v) => setCareer({ ...career, status: v }), "Статус профессии")}
          <input aria-label="Название (kk)" placeholder="Название (kk)" value={career.titleKk} onChange={(e) => setCareer({ ...career, titleKk: e.target.value })} className="min-h-[44px] rounded-xl border-2 border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900" />
          <input aria-label="Название (en)" placeholder="Название (en)" value={career.titleEn} onChange={(e) => setCareer({ ...career, titleEn: e.target.value })} className="min-h-[44px] rounded-xl border-2 border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900" />
        </div>
        <button className="btn-primary" onClick={() => act({ action: "set_career", careerId: career.careerId, status: career.status, ...(career.titleKk ? { titleKk: career.titleKk } : {}), ...(career.titleEn ? { titleEn: career.titleEn } : {}) })}>Сохранить профессию</button>
      </section>
    </div>
  );
}

function ExerciseEditor({ ex, onSave }: { ex: Ex; onSave: (b: { prompt: string; explanation: string; answerKey: string }) => void }) {
  const [p, setP] = useState(ex.prompt.ru), [e, setE] = useState(ex.explanation.ru), [k, setK] = useState(JSON.stringify(ex.answerKey));
  return (
    <div className="space-y-2 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
      <p className="font-bold">{ex.id} · {ex.type}</p>
      <label className="block">Вопрос<textarea value={p} onChange={(x) => setP(x.target.value)} rows={2} className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900" /></label>
      <label className="block">Объяснение<textarea value={e} onChange={(x) => setE(x.target.value)} rows={2} className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900" /></label>
      <label className="block">Правильный ответ (JSON)<textarea value={k} onChange={(x) => setK(x.target.value)} rows={2} className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-white p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900" /></label>
      <button className="btn-ghost" onClick={() => onSave({ prompt: p, explanation: e, answerKey: k })}>Сохранить задание</button>
    </div>
  );
}
