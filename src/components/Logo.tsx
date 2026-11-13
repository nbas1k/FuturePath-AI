// Логотип: растущие ступени на зелёной плитке.
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="9" className="fill-indigo-600" />
        <path d="M8 22v-4M13 22v-7M18 22v-10M23 22v-13" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className={`font-display text-lg font-extrabold tracking-display text-slate-900 dark:text-white ${compact ? "hidden lg:inline" : ""}`}>
        FuturePath <span className="text-indigo-600 dark:text-indigo-300">AI</span>
      </span>
    </span>
  );
}
