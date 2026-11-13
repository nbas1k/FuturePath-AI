import Link from "next/link";
import { loadJourney } from "@/backend/journeyContext";
import { loadTrack } from "@/backend/track";
import { loadChallenge } from "@/backend/challenge";
import { loadSim } from "@/backend/simulator";
import { loadSkillMap } from "@/backend/skillMap";
import { RESOURCES_CHECKED, resourcesFor } from "@/data/resources";
import { ResourcesPanel } from "@/components/ResourcesPanel";
import { loadScenarios } from "@/backend/scenarios";
import { ScenariosPanel } from "@/components/ScenariosPanel";
import { loadCycle } from "@/backend/cycle";
import { CyclePanel } from "@/components/CyclePanel";
import { loadSoft } from "@/backend/softSkills";
import { SoftSkillsPanel } from "@/components/SoftSkillsPanel";
import { loadMentor } from "@/backend/mentor";
import { loadInterview } from "@/backend/interview";
import { INTERVIEWS } from "@/data/interview";
import { MentorPanel } from "@/components/MentorPanel";
import { InterviewPanel } from "@/components/InterviewPanel";
import { getProfile } from "@/backend/profile";
import { TRACKS, TRACK_PROFESSIONS } from "@/data/track";
import { CHALLENGES } from "@/data/challenge";
import { SIMS } from "@/data/simulator";
import { professionById } from "@/data/professions";
import { recommendNext, type LearnTab } from "@/learn/recommend";
import { TrackPanel } from "@/components/TrackPanel";
import { ChallengePanel } from "@/components/ChallengePanel";
import { SimulatorPanel } from "@/components/SimulatorPanel";
import { SkillMapPanel } from "@/components/SkillMapPanel";
import { LearnTabs } from "@/components/LearnTabs";
import { GoalPicker, type GoalOption } from "@/components/GoalPicker";
import { SectionTools } from "@/components/SectionTools";
import { PROFESSIONS } from "@/data/professions";
import { CYCLES } from "@/data/cycle";

export const dynamic = "force-dynamic";
export const metadata = { title: "Обучение — FuturePath AI" };

// Раздел «Обучение». Инструменты открываются в контексте выбранной профессии:
// курс, Human + AI Challenge, Job Simulator и карта навыков. Сверху — один рекомендуемый шаг.
export default async function LearnPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const initialTab = sp.tab as LearnTab | undefined;
  const goalOptions: GoalOption[] = PROFESSIONS.map((p) => ({ id: p.id, title: p.title, full: Boolean(CYCLES[p.id]) })).sort((a, b) => Number(b.full) - Number(a.full) || a.title.localeCompare(b.title, "ru"));
  const data = await loadJourney();
  const profile = await getProfile();
  const selected = data.selected;
  const started = data.facts.planStarted;

  let body: React.ReactNode;

  if (!selected || !profile) {
    // Цель ещё не выбрана. Тест не нужен: выбираем профессию прямо здесь. Инструменты без профессии доступны сразу.
    const soft = await loadSoft(profile?.id ?? null);
    const tabs: { id: LearnTab; label: string }[] = [{ id: "goal", label: "Выбор цели" }, { id: "soft", label: "Мягкие навыки" }, { id: "resources", label: "Ресурсы" }];
    const panels: Partial<Record<LearnTab, React.ReactNode>> = {
      goal: (
        <div className="card space-y-4">
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">AI Readiness · шаг 1</p>
          <h2 className="text-xl font-bold">Выберите цель подготовки</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Мы проверим ваши навыки без ИИ, подтянем пробелы, дадим задания вместе с ИИ и проверим заново. Тест профессий не нужен.</p>
          <GoalPicker options={goalOptions} current={null} />
        </div>
      ),
      soft: <SoftSkillsPanel state={soft} />,
      resources: <ResourcesPanel items={resourcesFor("")} checked={RESOURCES_CHECKED} />,
    };
    body = <LearnTabs tabs={tabs} recommended={{ tab: "goal", title: "Выберите цель подготовки", text: "Выберите профессию, и откроется весь маршрут: диагностика, обучение, работа с ИИ, повторная проверка." }} panels={panels} initialTab={initialTab} />;
  } else {
    const id = selected.id;
    const hasCourse = Boolean(TRACKS[id]);
    const hasChallenge = Boolean(CHALLENGES[id]);
    const hasSim = Boolean(SIMS[id]);

      const hasInterview = Boolean(INTERVIEWS[id]);
      const [track, challenge, sim, skills, mentor, interview, soft, scenarios, cycle] = await Promise.all([
        hasCourse ? loadTrack(profile.id, id) : Promise.resolve(null),
        hasChallenge ? loadChallenge(profile.id, id) : Promise.resolve(null),
        hasSim ? loadSim(profile.id, id) : Promise.resolve(null),
        loadSkillMap(profile.id, id),
        loadMentor(profile.id, id),
        hasInterview ? loadInterview(profile.id, id) : Promise.resolve(null),
        loadSoft(profile.id),
        loadScenarios(profile.id, id),
        loadCycle(profile.id, id),
      ]);
      const title = professionById(id)?.title ?? selected.title;

      const recommended = recommendNext({
        hasCourse, hasChallenge, hasSim,
        round1Done: track?.round1 != null,
        lessonsRead: track?.lessonsRead ?? 0,
        lessonsTotal: track?.lessons.length ?? 0,
        round2Done: track?.round2 != null,
        challengePhase: challenge?.phase ?? null,
        simFinishedRuns: sim?.finishedRuns ?? 0,
        hasInterview,
        interviewDone: (interview?.history.length ?? 0) > 0,
        softDone: soft.attempts > 0,
        hasCycle: cycle.supported,
        cycleDone: cycle.history.length > 0 && (!cycle.run || cycle.stage === "proof"), // цикл в процессе (не на первом и не на последнем экране) остаётся рекомендуемым шагом
        cycleStage: cycle.stage,
      });

      const tabs: { id: LearnTab; label: string }[] = [];
      const panels: Partial<Record<LearnTab, React.ReactNode>> = {};
      if (cycle.supported) { tabs.push({ id: "cycle", label: "Мой цикл" }); panels.cycle = <CyclePanel professionId={id} professionTitle={title} state={cycle} />; }
      if (track) { tabs.push({ id: "course", label: "Курс" }); panels.course = <TrackPanel professionId={id} professionTitle={title} track={track} />; }
      if (challenge) { tabs.push({ id: "challenge", label: "Сам и с ИИ" }); panels.challenge = <ChallengePanel professionId={id} state={challenge} />; }
      if (sim) { tabs.push({ id: "sim", label: "Рабочий день" }); panels.sim = <SimulatorPanel professionId={id} state={sim} />; }
      if (interview) { tabs.push({ id: "interview", label: "Собеседование" }); panels.interview = <InterviewPanel professionId={id} state={interview} />; }
      tabs.push({ id: "soft", label: "Мягкие навыки" });
      panels.soft = <SoftSkillsPanel state={soft} />;
      if (skills) { tabs.push({ id: "skills", label: "Карта навыков" }); panels.skills = <SkillMapPanel data={skills} />; }
      tabs.push({ id: "scenarios", label: "Сценарии 2030–2035" });
      panels.scenarios = <ScenariosPanel professionId={id} professionTitle={title} state={scenarios} />;
      tabs.push({ id: "resources", label: "Ресурсы" });
      panels.resources = <ResourcesPanel items={resourcesFor(id)} checked={RESOURCES_CHECKED} />;
      tabs.push({ id: "mentor", label: "Наставник" });
      panels.mentor = <MentorPanel professionId={id} professionTitle={title} state={mentor} />;

      const note = !hasCourse && !hasChallenge && !hasSim ? (
        <p className="mb-3 rounded-lg bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">Для профессии «{title}» пока нет мини-курса, заданий и симулятора (они есть для: {TRACK_PROFESSIONS.map((p) => professionById(p)?.title).filter(Boolean).join(", ")}). Доступны мягкие навыки, карта навыков, сценарии, ресурсы и наставник.</p>
      ) : null;
      body = <>{note}<LearnTabs key={id} tabs={tabs} recommended={recommended} panels={panels} initialTab={initialTab} /></>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="h2 mb-1">Обучение</h1>
        <p className="text-sm text-slate-500">
          {selected ? `Профессия: ${selected.title}. ` : ""}Не знаете, с чего начать? Откройте «Мой путь».
        </p>
      </div>

      {selected && (
        <details className="card text-sm">
          <summary className="cursor-pointer font-medium">Сменить цель подготовки</summary>
          <div className="mt-3"><GoalPicker options={goalOptions} current={selected.id} /></div>
        </details>
      )}

      {body}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">План на 30 дней</h2>
            <p className="text-sm text-slate-500">{started ? `Выполнено заданий: ${data.facts.tasksDone}.` : "Маленькие задания на каждый день."}</p>
          </div>
          <Link href="/plan" className="btn-ghost">{started ? "Продолжить" : "Открыть"}</Link>
        </div>
        <div className="card flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">AI-помощник</h2>
            <p className="text-sm text-slate-500">Анализ, план и влияние ИИ на профессию.</p>
          </div>
          <Link href="/ai" className="btn-ghost">Открыть</Link>
        </div>
      </div>

      <SectionTools section="learn" title="Инструменты раздела «Обучение»" />
    </div>
  );
}
