import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CAREERS } from "@/catalog/build";
import { CareerCatalog } from "@/components/CareerCatalog";
import { getT } from "@/i18n/server";
import { careerOverrides } from "@/backend/careerOverrides";

export const dynamic = "force-dynamic";
export const metadata = { title: "FuturePath AI" };

export default async function ProfessionsPage() {
  const { t, lang } = await getT();
  const ov = await careerOverrides();
  const items = CAREERS.filter((c) => (ov.get(c.id)?.status ?? "published") === "published").map((c) => ({ id: c.id, direction: c.direction, titles: { ...c.titles, kk: ov.get(c.id)?.titleKk || c.titles.kk, en: ov.get(c.id)?.titleEn || c.titles.en }, readiness: c.readiness }));
  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{t("cat.title")}</h1>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{t("cat.count", { n: items.length })}</p>
        <p className="text-xs text-slate-500">{t("cat.draftNote")}</p>
      </header>
      <Link href="/assessment" className="card flex min-h-[56px] items-center gap-3 !py-3 font-bold hover:bg-slate-50 dark:hover:bg-slate-800">
        <span className="flex-1">{t("home.rec.test")}</span><ArrowRight size={18} className="text-slate-400" aria-hidden />
      </Link>
      <CareerCatalog careers={items} />
      {lang !== "ru" && <p className="text-xs text-slate-500">{t("cat.ruOnly")}</p>}
    </div>
  );
}
