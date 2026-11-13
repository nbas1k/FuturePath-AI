import type { Resource } from "@/data/resources";

export function ResourcesPanel({ items, checked }: { items: Resource[]; checked: string }) {
  return (
    <div className="space-y-4">
      <div className="card space-y-1">
        <h2 className="text-xl font-bold">Где учиться дальше</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">Только публичные сайты, которые мы открыли и проверили на доступность {checked}. Условия (бесплатно или платно, язык, сроки) смотрите на самом сайте: мы их не обещаем и качество курсов не гарантируем.</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((r) => (
          <li key={r.url} className="card space-y-1">
            <p className="font-semibold">{r.name}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">{r.what}</p>
            <a className="break-all text-sm text-indigo-600 underline dark:text-indigo-400" href={r.url} target="_blank" rel="noopener noreferrer">{r.url}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
