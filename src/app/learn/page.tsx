import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, GraduationCap } from "lucide-react";
import { getProfile } from "@/backend/profile";
import { getTrack, listTracks } from "@/backend/learn";
import { getCareer } from "@/catalog/build";
import { getT } from "@/i18n/server";
import { trackSlug } from "@/learn/slug";
import { VOICE_PROMPTS } from "@/voice/score";
import type { MessageKey } from "@/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "FuturePath AI" };

export default async function LearnHome({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  // Старые ссылки вида /learn?tab=… ведут в дополнительные инструменты
  if (sp.tab) redirect(`/learn/tools?tab=${encodeURIComponent(sp.tab)}`);

  const { t, lang } = await getT();
  const profile = await getProfile();
  const tracks = await listTracks();
  const careerId = profile?.selectedProfession ?? null;
  const career = careerId ? getCareer(careerId) : null;
  const careerTrack = career ? tracks.find((x) => x.trackId === `career:${career.id}`) : null;
  const skillTracks = tracks.filter((x) => x.kind === "skill");

  // «Продолжить»: первый доступный урок в треке выбранной профессии
  let cont: { href: string } | null = null;
  if (careerTrack) {
    const tv = await getTrack(careerTrack.trackId, profile?.id ?? null, lang);
    const next = tv?.modules.flatMap((m) => m.lessons).find((l) => l.state === "in_progress" || l.state === "available" || l.state === "needs_review");
    if (next) cont = { href: `/learn/lesson/${next.id.replace(/\//g, "~")}` };
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold sm:text-3xl">{t("learn.title")}</h1>

      <section className="card space-y-3 !border-indigo-200 !bg-indigo-50 dark:!border-indigo-800 dark:!bg-indigo-950" aria-labelledby="c-h">
        <h2 id="c-h" className="text-sm font-extrabold text-indigo-700 dark:text-indigo-200">{t("learn.career")}</h2>
        {career ? (
          <>
            <p className="text-xl font-extrabold">{career.titles[lang]}</p>
            {careerTrack ? (
              <div className="flex flex-wrap gap-3">
                {cont && <Link href={cont.href} className="btn-primary !text-base">{t("home.continue")}<ArrowRight size={18} className="ml-2" aria-hidden /></Link>}
                <Link href={`/learn/track/${trackSlug(careerTrack.trackId)}`} className="btn-ghost">{t("learn.lessons", { n: careerTrack.lessonCount })}</Link>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-700 dark:text-slate-300">{t("learn.noCareerTrack")}</p>
                <div className="flex flex-wrap gap-3"><Link href={`/professions/${career.id}`} className="btn-primary">{t("cat.intro.title")}</Link><Link href="/learn/tools?tab=cycle" className="btn-ghost">{t("learn.openTools")}</Link></div>
              </>
            )}
          </>
        ) : (
          <><p className="font-bold">{t("learn.pickCareer")}</p><Link href="/professions" className="btn-primary">{t("home.pickProfession")}</Link></>
        )}
      </section>

      {skillTracks.length > 0 && (
        <section className="space-y-3" aria-labelledby="s-h">
          <h2 id="s-h" className="text-lg font-extrabold">{t("learn.skills")}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {skillTracks.map((s) => {
              const key = s.trackId.split(":")[1];
              return (
                <li key={s.trackId}>
                  <Link href={`/learn/track/${trackSlug(s.trackId)}`} className="card flex min-h-[64px] items-center gap-3 !py-3 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <GraduationCap size={22} className="text-indigo-600" aria-hidden />
                    <span className="flex-1"><span className="block font-extrabold">{t(`us.${key}` as MessageKey)}</span><span className="text-xs font-semibold text-slate-500">{t("learn.lessons", { n: s.lessonCount })}</span></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="space-y-3" aria-labelledby="v-h">
        <h2 id="v-h" className="text-lg font-extrabold">{t("learn.voice")}</h2>
        <ul className="grid gap-3 sm:grid-cols-2">{VOICE_PROMPTS.map((v) => <li key={v.id}><Link href={`/learn/voice/${v.id}`} className="card block !py-3 font-extrabold hover:bg-slate-50 dark:hover:bg-slate-800">{v.title}</Link></li>)}</ul>
      </section>

      <Link href="/learn/tools" className="inline-block text-sm font-bold text-indigo-700 underline dark:text-indigo-300">{t("learn.openTools")}</Link>
    </div>
  );
}
