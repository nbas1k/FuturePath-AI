// Логотип: деления линейки и маркер. Тот же образ, что и на главной: измеряем навык до и после.
export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="7" className="fill-slate-900 dark:fill-slate-50" />
        <path d="M7 22h18" stroke="#FFD84D" strokeWidth="3" strokeLinecap="round" />
        <path d="M9 22v-4M13 22v-6M17 22v-8M21 22v-11" className="stroke-white dark:stroke-slate-900" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="font-display text-[17px] font-semibold tracking-display text-slate-900 dark:text-white">FuturePath <span className="font-medium text-indigo-600 dark:text-indigo-300">AI</span></span>
    </span>
  );
}
