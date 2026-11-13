import { notFound } from "next/navigation";
import { CODE_SIM_BY_ID, SIM_BY_ID } from "@/sim/defs";
import { SimPlayer, type PubSim } from "@/components/SimPlayer";
import { CodeSim, type PubCodeSim } from "@/components/CodeSim";

export const dynamic = "force-dynamic";
export const metadata = { title: "FuturePath AI" };

export default async function SimPage({ params }: { params: Promise<{ simId: string }> }) {
  const id = decodeURIComponent((await params).simId);
  const back = (career: string) => `/professions/${career}`;
  const code = CODE_SIM_BY_ID.get(id);
  if (code) {
    const pub: PubCodeSim = { id: code.id, title: code.title, goal: code.goal, scenario: code.scenario, disclaimer: code.disclaimer, starter: code.starter, fnName: code.fnName, tests: code.tests, hints: code.hints, backHref: back(code.career) };
    return <CodeSim sim={pub} />;
  }
  const s = SIM_BY_ID.get(id);
  if (!s) notFound();
  // Клиенту передаются только тексты: баллы, эффекты, ответы «пациента» и ожидаемые числа остаются на сервере.
  const pub: PubSim = {
    id: s.id, title: s.title, goal: s.goal, scenario: s.scenario, disclaimer: s.disclaimer, stateVars: s.stateVars ?? {}, drawing: s.drawing, backHref: back(s.career),
    steps: s.steps.map((st) => st.kind === "number" ? { id: st.id, kind: "number", prompt: st.prompt, unit: st.unit } : st.kind === "pick" ? { id: st.id, kind: "pick", prompt: st.prompt, options: st.options.map((o) => o.text) } : { id: st.id, kind: "multi", prompt: st.prompt, max: st.max, options: st.options.map((o) => o.text) }),
  };
  return <SimPlayer sim={pub} />;
}
