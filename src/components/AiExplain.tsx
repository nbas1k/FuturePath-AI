"use client";
import { useState } from "react";

type Reply = { mode: "ai" | "fallback"; reason?: string; provider?: string; model?: string; text: string; prompt: { system: string; user: string } };

// Кнопка «Объяснить с помощью ИИ». Запрос идёт на НАШ сервер (/api/ai), ключа в браузере нет.
export function AiExplain() {
  const [reply, setReply] = useState<Reply | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);

  async function ask() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setReply(data);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }

  return (
    <section className="card">
      <h2 className="mb-1 text-lg font-semibold">Объяснение результата</h2>
      <p className="mb-3 text-sm text-slate-500">Подробное объяснение от ИИ (если подключён провайдер) или честный резервный текст по правилам.</p>
      <button className="btn-primary" onClick={ask} disabled={loading}>{loading ? "Запрос…" : "Объяснить результат"}</button>
      {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
      {reply && (
        <div className="fade-in mt-4 space-y-3">
          {reply.mode === "ai" ? (
            <span className="chip">Ответ ИИ: {reply.provider} / {reply.model}</span>
          ) : (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Резервный режим — это не ответ ИИ. {reply.reason}
            </p>
          )}
          <p className="whitespace-pre-line text-sm leading-relaxed">{reply.text}</p>
          <button className="text-xs text-indigo-600 underline dark:text-indigo-400" onClick={() => setShowPrompt(!showPrompt)}>
            {showPrompt ? "Скрыть" : "Показать"}, что отправляется ИИ
          </button>
          {showPrompt && (
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-100 p-3 text-xs dark:bg-slate-800">{reply.prompt.system + "\n\n" + reply.prompt.user}</pre>
          )}
        </div>
      )}
    </section>
  );
}
