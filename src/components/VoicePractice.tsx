"use client";
import { useRef, useState } from "react";
import { useI18n } from "@/i18n/client";
import type { VoiceScore } from "@/voice/score";

type Pub = { id: string; title: string; question: string; tips: string[] };
type Result = { score: VoiceScore; ai: { available: true; strengths: string; recommendations: string } | { available: false; error: string } };
const REC_LANG = { ru: "ru-RU", kk: "kk-KZ", en: "en-US" } as const;

export function VoicePractice({ prompt }: { prompt: Pub }) {
  const { lang } = useI18n();
  const [consent, setConsent] = useState(false);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [source, setSource] = useState<"voice" | "text">("text");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const rec = useRef<any>(null);
  const supported = typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  function start() {
    setMsg("");
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const r = new SR();
    r.lang = REC_LANG[lang]; r.interimResults = false; r.continuous = true;
    r.onresult = (e: any) => { const t = Array.from(e.results).map((x: any) => x[0].transcript).join(" "); setText((prev) => (prev ? prev + " " : "") + t); setSource("voice"); };
    r.onerror = (e: any) => { setListening(false); setMsg(e.error === "not-allowed" ? "Доступ к микрофону не разрешён. Вы можете ввести ответ текстом." : "Не удалось распознать речь. Повторите или введите ответ текстом."); };
    r.onend = () => setListening(false);
    rec.current = r; setListening(true); r.start();
  }
  const stop = () => { rec.current?.stop(); setListening(false); };

  async function submit() {
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/voice/evaluate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ promptId: prompt.id, transcript: text, consent: true, source }) });
      const j = await r.json();
      if (!r.ok) return setMsg(j.error ?? "Не удалось отправить. Повторите попытку.");
      setResult(j);
    } catch { setMsg("Нет связи с сервером. Повторите попытку."); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <header className="space-y-2"><h1 className="text-2xl font-extrabold">{prompt.title}</h1><p className="text-lg font-bold">{prompt.question}</p>
        <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400">{prompt.tips.map((t) => <li key={t}>{t}</li>)}</ul></header>

      <label className="card flex min-h-[52px] items-start gap-3 !p-3 text-sm">
        <input type="checkbox" className="mt-1 h-5 w-5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>Я согласен(на) на распознавание речи. Распознавание делает браузер и может отправлять звук своему сервису. FuturePath AI получает только текст, звук не сохраняется. Можно не использовать микрофон и ввести ответ текстом.</span>
      </label>

      <div className="flex flex-wrap gap-3">
        {supported ? (listening ? <button className="btn-primary" onClick={stop}>Остановить запись</button> : <button className="btn-primary" disabled={!consent} onClick={start}>Начать запись</button>) : <p role="status" className="text-sm font-semibold text-slate-500">Распознавание речи не поддерживается этим браузером. Введите ответ текстом.</p>}
      </div>
      <label className="block space-y-1"><span className="text-sm font-bold">Ответ (можно исправить ошибки распознавания)</span>
        <textarea rows={6} maxLength={3000} value={text} onChange={(e) => setText(e.target.value)} className="w-full rounded-2xl border-2 border-slate-200 bg-white p-3 font-semibold dark:border-slate-700 dark:bg-slate-900" /></label>
      {msg && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950 dark:text-red-200">{msg}</p>}
      <button className="btn-primary w-full !text-base" disabled={busy || !consent || !text.trim()} onClick={submit}>Оценить ответ</button>

      {result && (
        <section className="card space-y-3" aria-labelledby="vr-h">
          <h2 id="vr-h" className="text-lg font-extrabold">Результат по рубрике</h2>
          <p className="text-xs text-slate-500">Оценивается только содержание ответа, а не голос, уверенность или эмоции.</p>
          <ul className="space-y-2">{result.score.criteria.map((c) => <li key={c.id}><div className="flex justify-between text-sm font-bold"><span>{c.label}</span><span>{Math.round(c.score * 100)}%</span></div><div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${c.score * 100}%` }} /></div></li>)}</ul>
          <p className="text-sm"><span className="font-bold">Есть в ответе: </span>{result.score.hit.join(", ") || "—"}</p>
          <p className="text-sm"><span className="font-bold">Стоит добавить: </span>{result.score.missed.join(", ") || "—"}</p>
          {result.ai.available ? <div className="space-y-1 text-sm"><p><span className="font-bold">Сильные стороны (ИИ): </span>{result.ai.strengths}</p><p><span className="font-bold">Рекомендации (ИИ): </span>{result.ai.recommendations}</p></div> : <p role="status" className="rounded-xl bg-slate-100 p-3 text-sm font-semibold dark:bg-slate-800">{result.ai.error}</p>}
          <button className="btn-ghost" onClick={() => { setResult(null); }}>Повторить попытку</button>
        </section>
      )}
    </div>
  );
}
