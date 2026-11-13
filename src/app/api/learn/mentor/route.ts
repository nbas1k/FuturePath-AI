import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateProfile, getProfile } from "@/backend/profile";
import { askMentor, mentorHistory, recommendPracticeFor } from "@/backend/learnMentor";
import { getAiConfig, isAiEnabled } from "@/backend/ai/config";
import { getLang } from "@/i18n/server";
import { MAX_MESSAGE_CHARS, MENTOR_MODES } from "@/learn/mentorPrompt";

export const dynamic = "force-dynamic";

const Body = z.object({
  lessonId: z.string().min(1).max(160),
  exerciseId: z.string().min(1).max(200).optional(),
  mode: z.enum(MENTOR_MODES),
  message: z.string().max(MAX_MESSAGE_CHARS).default(""),
}).strict();

// Состояние наставника: подключён ли ИИ, история диалога по уроку и рекомендация тренировки (работает без ИИ).
export async function GET(req: Request) {
  const lessonId = new URL(req.url).searchParams.get("lessonId") ?? "";
  const profile = await getProfile();
  const lang = await getLang();
  return NextResponse.json({
    aiEnabled: isAiEnabled(getAiConfig()),
    history: profile && lessonId ? await mentorHistory(profile.id, lessonId) : [],
    practice: profile ? await recommendPracticeFor(profile.id, lang) : [],
  });
}

export async function POST(req: Request) {
  let json: unknown;
  try { json = await req.json(); } catch { return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 }); }
  const p = Body.safeParse(json);
  if (!p.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  if ((p.data.mode === "dialog" || p.data.mode === "explain_error") && !p.data.message.trim() && p.data.mode === "dialog") return NextResponse.json({ error: "Введите вопрос" }, { status: 400 });
  const profile = await getOrCreateProfile();
  const r = await askMentor(profile.id, { ...p.data, lang: await getLang() });
  return r.ok ? NextResponse.json({ reply: r.reply }) : NextResponse.json({ error: r.error, code: r.code }, { status: r.status });
}
