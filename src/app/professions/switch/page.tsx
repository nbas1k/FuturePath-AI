import Link from "next/link";
import { PROFESSIONS, professionById, LEVEL_LABELS } from "@/data/professions";
import { getProfile } from "@/backend/profile";
import { loadSkillMap } from "@/backend/skillMap";
import { planSwitch } from "@/career/switch";

export const dynamic = "force-dynamic";
export const metadata = { title: "Смена профессии — FuturePath AI" };

function List({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <section className="card">
      <h2 className="mb-2 font-semibold">{title}</h2>
      {items.length ? <ul className="list-disc space-y-1 pl-5 text-sm">{items.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="text-sm text-slate-500">{empty}</p>}
    </section>
  );
}

// Career Switch Navigator: сравнение навыков текущей (выбранной) и целевой профессии
export default async function SwitchPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const profile = await getProfile();
  const fromId = sp.from ?? profile?.selectedProfession ?? "";
  const from = professionById(fromId);
  const to = sp.to ? professionById(sp.to) : undefined;

  let confirmed: string[] = [];
  if (profile && from) {
    const map = await loadSkillMap(profile.id, from.id);
    confirmed = map?.map.rows.filter((r) => r.status === "confirmed").map((r) => r.skill) ?? [];
  }
  const plan = from && to && from.id !== to.id ? planSwitch(from.skills, to.skills, confirmed) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/professions" className="text-sm text-indigo-600 dark:text-indigo-400">← Все профессии</Link>
      <div>
        <h1 className="h2 mb-1">Смена профессии</h1>
        <p className="text-sm text-slate-500">Сравним навыки двух профессий: что у вас уже есть, что нужно добавить. Это сравнение списков навыков из каталога, а не прогноз успеха.</p>
      </div>

      <form method="get" className="card grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-sm">Откуда
          <select name="from" defaultValue={from?.id ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
            <option value="" disabled>Выберите</option>
            {PROFESSIONS.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </label>
        <label className="text-sm">Куда
          <select name="to" defaultValue={to?.id ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
            <option value="" disabled>Выберите</option>
            {PROFESSIONS.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </label>
        <button className="btn-primary" type="submit">Сравнить</button>
      </form>

      {from && to && from.id === to.id && <p className="card text-sm">Выбраны одинаковые профессии. Выберите разные.</p>}

      {plan && from && to && (
        <div className="space-y-4">
          <div className="card text-sm">
            <p><b>{from.title}</b> → <b>{to.title}</b></p>
            <p className="mt-1 text-slate-600 dark:text-slate-400">Общих навыков: {plan.same.length}, близких по смыслу: {plan.similar.length}, нужно добавить: {plan.toLearn.length} из {to.skills.length}. Подготовка к целевой профессии: {LEVEL_LABELS[to.level]}.</p>
          </div>
          <List title="Уже есть (навык совпадает)" items={plan.same.map((s) => (plan.carried.includes(s) ? `${s} — подтверждён вашими заданиями` : s))} empty="Совпадающих навыков нет. Это нормально при смене сферы." />
          <section className="card">
            <h2 className="mb-1 font-semibold">Близкие по смыслу</h2>
            <p className="mb-2 text-xs text-slate-500">Найдены по общим словам в названии, это подсказка: проверьте сами, действительно ли навыки похожи.</p>
            {plan.similar.length ? <ul className="list-disc space-y-1 pl-5 text-sm">{plan.similar.map((x) => <li key={x.target}>{x.target} ≈ {x.from}</li>)}</ul> : <p className="text-sm text-slate-500">Нет.</p>}
          </section>
          <List title="Что нужно добавить" items={plan.toLearn} empty="Все навыки целевой профессии уже совпадают или похожи." />
          <List title="Что в целевой профессии не названо" items={plan.unusedFromCurrent} empty="Ничего." />
          <List title="Как можно учиться" items={to.study} empty="" />
          <div className="flex flex-wrap gap-2">
            <Link href={`/professions/${to.id}`} className="btn-ghost">Открыть «{to.title}»</Link>
            <Link href={`/compare?a=${from.id}&b=${to.id}`} className="btn-ghost">Сравнить профессии подробно</Link>
          </div>
        </div>
      )}
    </div>
  );
}
