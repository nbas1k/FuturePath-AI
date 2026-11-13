"use client";
import { useState } from "react";
import type { AnalysisOutput, RoadmapOutput, SimulatorOutput } from "@/backend/ai/schemas";
import type { PlanDay } from "@/data/plan";
import { PlanChecklist } from "./PlanChecklist";

// Общая форма ответа API: либо ответ ИИ, либо резерв с причиной
type Outcome<T> = { mode: "ai"; provider: string; model: string; data: T; source: string } | { mode: "fallback"; reason: string; data: T; source: string };
type Stored<T> = { source: string; createdAt: string; data: T };

// Плашка: честно показывает, что это — ответ ИИ или резервный текст
function SourceBadge({ outcome }: { outcome: { mode: string; reason?: string; provider?: string; model?: string } }) {
  if (outcome.mode === "ai") return <span className="chip">Ответ ИИ · {outcome.provider} / {outcome.model}</span>;
  return (
    <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
      <b>Резервный режим, это не ответ ИИ.</b> {outcome.reason}
    </p>
  );
}

function Busy({ text }: { text: string }) {
  return <p className="animate-pulse text-sm text-slate-500">{text}</p>;
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-400">{items.map((t) => <li key={t}>{t}</li>)}</ul>
    </div>
  );
}

const FOOTNOTE = "Это текст, созданный моделью ИИ или правилами сайта. Он не факт и не прогноз рынка труда. Баллы теста не изменены.";

// Раздел 1: анализ результата
function AnalysisCard({ initial }: { initial: Stored<AnalysisOutput> | null }) {
  const [data, setData] = useState<Stored<AnalysisOutput> | null>(initial);
  const [outcome, setOutcome] = useState<Outcome<AnalysisOutput> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/ai/analysis", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Ошибка");
      setOutcome(json);
      setData({ source: json.source, createdAt: new Date().toISOString(), data: json.data });
    } catch (e) { setError((e as Error).message); }
    setLoading(false);
  }

  const shown = outcome ? { source: outcome.source, data: outcome.data } : data;
  return (
    <section className="card space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Функция 1</p>
          <h2 className="text-xl font-bold">Анализ результата</h2>
          <p className="text-sm text-slate-500">Сильные стороны, интересы и навыки по вашим ответам.</p>
        </div>
        <button className="btn-primary" onClick={run} disabled={loading}>{loading ? "Анализируем…" : shown ? "Обновить анализ" : "Сделать анализ"}</button>
      </header>
      {loading && <Busy text="Запрос отправлен. Если ИИ не подключён, появится резервный текст." />}
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      {outcome && <SourceBadge outcome={outcome} />}
      {/* Сохранённый анализ: показываем, ответил ли ИИ, а не только что полученный ответ */}
      {!outcome && data && (
        data.source === "ai"
          ? <span className="chip">Ответ ИИ (сохранён {new Date(data.createdAt).toLocaleString("ru-RU")})</span>
          : <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200"><b>Резервный режим, это не ответ ИИ.</b> Сохранён текст, собранный по правилам.</p>
      )}
      {shown && (
        <div className="fade-in space-y-3">
          <p className="text-sm leading-relaxed">{shown.data.summary}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Block title="Сильные стороны" items={shown.data.strengths ?? []} />
            <Block title="Интересы" items={shown.data.interests ?? []} />
            <Block title="Навыки для развития" items={shown.data.skills ?? []} />
            {/* Старые записи анализа могут не содержать этих полей — тогда блоки просто пустые */}
            <Block title="Недостающие компетенции (по профессиям)" items={shown.data.missingSkills ?? []} />
            <Block title="Образовательные ресурсы (виды обучения)" items={shown.data.resources ?? []} />
          </div>
          <p className="text-xs text-slate-500">{FOOTNOTE}</p>
        </div>
      )}
    </section>
  );
}

// Раздел 2: дорожная карта на 30 дней с отслеживанием прогресса
function RoadmapCard({ initial }: { initial: { id: string; source: string; createdAt: string; days: RoadmapOutput["days"]; done: string[] } | null }) {
  const [roadmap, setRoadmap] = useState(initial);
  const [outcome, setOutcome] = useState<Outcome<RoadmapOutput> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/ai/roadmap", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Ошибка");
      setOutcome(json);
      // Новая карта = новый id = чистый прогресс
      setRoadmap({ id: json.recordId, source: json.source, createdAt: new Date().toISOString(), days: json.data.days, done: [] });
    } catch (e) { setError((e as Error).message); }
    setLoading(false);
  }

  const plan: PlanDay[] | null = roadmap
    ? roadmap.days.map((d) => ({ day: d.day, taskId: `d${d.day}`, task: `${d.title}. ${d.task}`, direction: null }))
    : null;

  return (
    <section className="card space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Функция 2</p>
          <h2 className="text-xl font-bold">План развития на 30 дней</h2>
          <p className="text-sm text-slate-500">Персональные задания. Отметки сохраняются именно для этой карты.</p>
        </div>
        <button className="btn-primary" onClick={run} disabled={loading}>{loading ? "Создаём…" : roadmap ? "Создать новую карту" : "Создать карту"}</button>
      </header>
      {loading && <Busy text="Создаём карту. Это может занять до 20 секунд." />}
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      {outcome && <SourceBadge outcome={outcome} />}
      {plan && roadmap && (
        <div className="fade-in">
          <p className="mb-3 text-xs text-slate-500">Карта от {new Date(roadmap.createdAt).toLocaleString("ru-RU")} · {roadmap.source === "ai" ? "создана ИИ" : "создана правилами (без ИИ)"}</p>
          {/* key — чтобы чек-лист перезагрузился при создании новой карты */}
          <PlanChecklist key={roadmap.id} planKey={`ai:${roadmap.id}`} plan={plan} initialDone={roadmap.done} />
        </div>
      )}
    </section>
  );
}

// Раздел 3: что ИИ может изменить в выбранной профессии
function SimulatorCard({ professions }: { professions: { id: string; title: string }[] }) {
  const [id, setId] = useState(professions[0]?.id ?? "");
  const [outcome, setOutcome] = useState<Outcome<SimulatorOutput> & { professionTitle?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/ai/simulator", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ professionId: id }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Ошибка");
      setOutcome(json);
    } catch (e) { setError((e as Error).message); }
    setLoading(false);
  }

  return (
    <section className="card space-y-4">
      <header>
        <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Функция 3</p>
        <h2 className="text-xl font-bold">Симулятор будущего профессии</h2>
        <p className="text-sm text-slate-500">Как ИИ может изменить задачи профессии и какие навыки останутся важными.</p>
      </header>
      <div className="flex flex-wrap gap-2">
        <select value={id} onChange={(e) => setId(e.target.value)} aria-label="Профессия"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-900">
          {professions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        <button className="btn-primary" onClick={run} disabled={loading || !id}>{loading ? "Разбираем…" : "Смоделировать"}</button>
      </div>
      {loading && <Busy text="Разбираем профессию…" />}
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      {outcome && (
        <div className="fade-in space-y-3">
          <SourceBadge outcome={outcome} />
          <p className="text-sm leading-relaxed">{outcome.data.summary}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Block title="Что ИИ может взять на себя" items={outcome.data.automates} />
            <Block title="Что останется важным для человека" items={outcome.data.humanSkills} />
          </div>
          <p className="rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-800"><b>Что сделать сейчас:</b> {outcome.data.advice}</p>
          <p className="text-xs text-slate-500">{FOOTNOTE}</p>
        </div>
      )}
    </section>
  );
}

export function AiWorkspace(props: {
  analysis: Stored<AnalysisOutput> | null;
  roadmap: { id: string; source: string; createdAt: string; days: RoadmapOutput["days"]; done: string[] } | null;
  professions: { id: string; title: string }[];
}) {
  return (
    <div className="space-y-6">
      <AnalysisCard initial={props.analysis} />
      <RoadmapCard initial={props.roadmap} />
      <SimulatorCard professions={props.professions} />
    </div>
  );
}
