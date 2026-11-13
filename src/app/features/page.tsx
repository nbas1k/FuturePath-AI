import Link from "next/link";
import { FeaturesCatalog } from "@/components/FeaturesCatalog";
import { COUNTS } from "@/data/features";

export const metadata = { title: "Все возможности — FuturePath AI" };

// Каталог всех 27 функций с честными статусами. Не пункт меню: ссылки есть на главной и в разделах.
export default function FeaturesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="h2 mb-1">Все возможности</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Все 27 запланированных функций с честным статусом: работает {COUNTS.ready}, частично {COUNTS.partial}, не реализовано {COUNTS.missing}. Для нереализованных функций кнопки запуска нет.
          Все инструменты поддерживают один маршрут: <Link href="/learn" className="text-indigo-600 underline dark:text-indigo-400">проверить и развить навыки для работы с ИИ</Link>.
        </p>
      </div>
      <FeaturesCatalog />
    </div>
  );
}
