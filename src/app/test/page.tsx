import { TestRunner } from "@/components/TestRunner";
import { QUESTIONS } from "@/data/questions";

export const metadata = { title: "Тест — FuturePath AI" };

export default function TestPage() {
  return (
    <div>
      <h1 className="h2 mb-2 text-center">Тест по профориентации</h1>
      <p className="mx-auto mb-6 max-w-xl text-center text-sm text-slate-500">
        {QUESTIONS.length} вопросов, около 5 минут. Нет «правильных» ответов — выбирай то, что ближе тебе. Это не научная психодиагностика.
      </p>
      <TestRunner />
    </div>
  );
}
