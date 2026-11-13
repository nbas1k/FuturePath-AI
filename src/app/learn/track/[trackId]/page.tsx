import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile } from "@/backend/profile";
import { getTrack } from "@/backend/learn";
import { getT } from "@/i18n/server";
import { PathMap } from "@/components/PathMap";
import { trackFromSlug } from "@/learn/slug";
import { getCareer } from "@/catalog/build";
import type { MessageKey } from "@/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "FuturePath AI" };

export default async function TrackPage({ params }: { params: Promise<{ trackId: string }> }) {
  const { trackId: slug } = await params;
  const trackId = trackFromSlug(slug);
  const { t, lang } = await getT();
  const profile = await getProfile();
  const track = await getTrack(trackId, profile?.id ?? null, lang);
  if (!track) notFound();
  const [kind, key] = trackId.split(":");
  const name = kind === "career" ? getCareer(key)?.titles[lang] ?? key : t(`us.${key}` as MessageKey);
  return (
    <div className="space-y-5">
      <Link href="/learn" className="text-sm font-bold text-indigo-700 dark:text-indigo-300">← {t("learn.back")}</Link>
      <h1 className="text-2xl font-extrabold">{name}</h1>
      <PathMap track={track} t={t as any} />
    </div>
  );
}
