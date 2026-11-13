import { notFound } from "next/navigation";
import { getLessonForPlay } from "@/backend/learn";
import { getLang } from "@/i18n/server";
import { LessonPlayer } from "@/components/LessonPlayer";
import { lessonFromSlug, trackSlug } from "@/learn/slug";

export const dynamic = "force-dynamic";
export const metadata = { title: "FuturePath AI" };

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId: slug } = await params;
  const lesson = await getLessonForPlay(lessonFromSlug(slug), await getLang());
  if (!lesson) notFound();
  return <LessonPlayer lesson={lesson} trackHref={`/learn/track/${trackSlug(lesson.trackId)}`} />;
}
