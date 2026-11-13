import { PROFESSIONS } from "@/data/professions";
import { ProfessionCatalog } from "@/components/ProfessionCatalog";
import { contextFromResult, loadUserResult } from "@/backend/catalogContext";
import Link from "next/link";
import { SectionTools } from "@/components/SectionTools";

export const dynamic = "force-dynamic";
export const metadata = { title: "Профессии — FuturePath AI" };

export default async function ProfessionsPage() {
  const user = await loadUserResult();
  const ctx = contextFromResult(user);
  const hasInterests = user.status === "ok" && user.result.hasInterests;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="h2 mb-1">Каталог профессий</h1>
        <p className="text-sm text-slate-500">
          {PROFESSIONS.length} профессий в 18 направлениях. Описания составлены авторами проекта как ориентир: это не данные о зарплатах и спросе на рынке труда.
        </p>
      </div>

      {user.status === "none" && (
        <p className="rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
          Пройдите <Link href="/test" className="underline">тест</Link>, и каталог покажет, какие профессии подходят вам и почему.
        </p>
      )}
      {user.status === "outdated" && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Ваш результат устарел. <Link href="/test" className="underline">Пройдите тест заново</Link>, чтобы видеть совпадения.
        </p>
      )}
      {user.status === "ok" && !user.result.hasInterests && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Ваш результат получен по первой версии теста: интересы по 18 направлениям не учитывались.
          {" "}<Link href="/test" className="underline">Пройдите обновлённый тест</Link>, чтобы учесть интересы.
        </p>
      )}

      <ProfessionCatalog
        professions={PROFESSIONS}
        matches={ctx.matches ?? {}}
        myCategories={ctx.myCategories ?? []}
        hasInterests={hasInterests}
      />

      <SectionTools section="professions" title="Инструменты раздела «Профессии»" />
    </div>
  );
}
