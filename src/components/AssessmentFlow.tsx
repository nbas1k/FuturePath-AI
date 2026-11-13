"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, X } from "lucide-react";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n";
import { itemText, orderedItems, type ChoiceItem, type Item, type LikertItem } from "@/assessment/items";
import type { Answers } from "@/assessment/score";

const SECTION_KEY: Record<Item["block"], MessageKey> = {
  interest: "as.section.interest", condition: "as.section.condition", situation: "as.section.situation", challenge: "as.section.challenge", self: "as.section.self",
};

export function AssessmentFlow({ pack, initialAnswers }: { pack: "core" | "refine"; initialAnswers: Answers }) {
  const router = useRouter();
  const { t, lang } = useI18n();
  const items = useMemo(() => orderedItems(pack), [pack]);
  const firstOpen = items.findIndex((i) => initialAnswers[i.id] === undefined);
  const resumed = firstOpen > 0;
  const [idx, setIdx] = useState(firstOpen === -1 ? items.length - 1 : firstOpen);
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showResume, setShowResume] = useState(resumed);

  const item = items[idx];
  const isLast = idx === items.length - 1;
  const answeredHere = items.filter((i) => answers[i.id] !== undefined).length;

  async function post(url: string, body: unknown): Promise<Response | null> {
    try {
      return await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    } catch {
      return null;
    }
  }

  async function finish() {
    setBusy(true);
    const res = await post("/api/assessment", { action: "complete" });
    setBusy(false);
    if (res?.ok) return router.push("/assessment/result");
    setError(res?.status === 422 ? t("as.error.tooFew") : t("as.error.complete"));
  }

  async function answer(value: number) {
    setBusy(true);
    setError("");
    const res = await post("/api/assessment/answer", { id: item.id, value });
    if (!res?.ok) {
      setBusy(false);
      setError(t("as.error.save"));
      return;
    }
    setAnswers((a) => ({ ...a, [item.id]: value }));
    setShowResume(false);
    if (isLast) return finish();
    setBusy(false);
    setIdx((i) => i + 1);
  }

  async function skip() {
    setError("");
    setShowResume(false);
    if (isLast) return finish();
    setIdx((i) => i + 1);
  }

  const likert = item.block === "interest" || item.block === "condition" || item.block === "self";
  const scalePrefix = item.block === "interest" ? "as.like." : "as.agree.";
  const ci = item as ChoiceItem;
  const current = answers[item.id];

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col">
      <header className="mb-6 flex items-center gap-3">
        <button type="button" className="btn-ghost !min-h-[44px] !px-3" aria-label={idx > 0 ? t("common.back") : t("common.skip")} onClick={() => (idx > 0 ? setIdx(idx - 1) : router.push("/professions"))}>
          {idx > 0 ? <ArrowLeft size={20} aria-hidden /> : <X size={20} aria-hidden />}
        </button>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={idx} aria-label={t("as.counter", { n: idx + 1, total: items.length })}>
          <div className="h-full rounded-full bg-indigo-500 transition-[width] duration-300" style={{ width: `${(idx / items.length) * 100}%` }} />
        </div>
        <span className="text-sm font-bold text-slate-500">{idx + 1}/{items.length}</span>
      </header>

      <div key={item.id} className="step-in flex flex-1 flex-col gap-5">
        {showResume && <p role="status" className="rounded-2xl bg-indigo-50 p-3 text-sm font-semibold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">{t("as.resumeNote", { n: idx + 1 })}</p>}
        <span className="chip self-start">{pack === "refine" ? t("as.refine.title") : t(SECTION_KEY[item.block])}</span>

        {item.block === "interest" && <p className="text-sm font-bold text-slate-500">{t("as.prompt.interest")}</p>}
        {(item.block === "condition" || item.block === "self") && <p className="text-sm font-bold text-slate-500">{t("as.prompt.agree")}</p>}
        {item.block === "situation" && <p className="text-sm font-bold text-slate-500">{t("as.prompt.situation")}</p>}
        {item.block === "challenge" && <p className="text-sm font-bold text-slate-500">{t("as.prompt.challenge")}</p>}

        {ci.context && <blockquote className="rounded-2xl border-2 border-slate-200 bg-white p-4 text-base dark:border-slate-700 dark:bg-slate-900">{itemText(ci.context, lang)}</blockquote>}
        <h1 className="text-2xl font-extrabold leading-snug">{itemText(item.text, lang)}</h1>

        <div className="space-y-3" role="group" aria-label={itemText(item.text, lang)}>
          {likert
            ? [1, 2, 3, 4, 5].map((v) => (
                <button key={v} type="button" disabled={busy} aria-pressed={current === v} onClick={() => answer(v)}
                  className={`flex min-h-[52px] w-full items-center rounded-2xl border-2 border-b-4 px-4 py-3 text-left font-bold transition duration-150 active:translate-y-[2px] active:border-b-2 disabled:opacity-60 ${current === v ? "border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950" : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"}`}>
                  <span className="mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm dark:bg-slate-800">{v}</span>
                  {t(`${scalePrefix}${v}` as MessageKey)}
                </button>
              ))
            : ci.options.map((o, i) => (
                <button key={i} type="button" disabled={busy} aria-pressed={current === i} onClick={() => answer(i)}
                  className={`flex min-h-[52px] w-full items-center rounded-2xl border-2 border-b-4 px-4 py-3 text-left font-bold transition duration-150 active:translate-y-[2px] active:border-b-2 disabled:opacity-60 ${current === i ? "border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950" : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"}`}>
                  {itemText(o.text, lang)}
                </button>
              ))}
        </div>
      </div>

      <footer className="mt-8 space-y-3">
        {error && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950 dark:text-red-200">{error}</p>}
        <button type="button" className="btn-ghost w-full" disabled={busy} onClick={skip}>{isLast ? t("as.showResults") : t("as.skipQuestion")}</button>
        {isLast && answeredHere > 0 && current !== undefined && <button type="button" className="btn-primary w-full !text-base" disabled={busy} onClick={finish}>{pack === "refine" ? t("as.refine.done") : t("as.showResults")}</button>}
      </footer>
    </div>
  );
}

export type { LikertItem };
