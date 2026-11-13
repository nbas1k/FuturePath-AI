// Настройки cookie профиля. Вынесено в отдельный файл, чтобы их можно было тестировать.
export const PROFILE_COOKIE = "fp_profile";

const ONE_YEAR_SEC = 60 * 60 * 24 * 365;

// httpOnly — скрипты в браузере не могут прочитать cookie (защита от XSS).
// sameSite lax — cookie не уходит с чужих сайтов при обычных переходах (защита от CSRF).
// secure — cookie уходит только по HTTPS. Включён в production.
// Если сайт работает по http (без HTTPS), задайте COOKIE_SECURE=false в .env.
export function profileCookieOptions(env: NodeJS.ProcessEnv = process.env, maxAgeSec = ONE_YEAR_SEC) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: env.NODE_ENV === "production" && env.COOKIE_SECURE !== "false",
    maxAge: maxAgeSec,
  };
}
