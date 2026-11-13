export const accountRu = {
  "acct.title": "Аккаунт", "acct.text": "Зарегистрируйтесь, чтобы сохранить прогресс и открывать приложение с любого устройства. Анонимный прогресс этого браузера сохранится.",
  "acct.textIn": "Вы вошли в аккаунт. Прогресс привязан к вашему email.", "acct.register": "Регистрация", "acct.login": "Вход", "acct.logout": "Выйти",
  "acct.email": "Email", "acct.password": "Пароль (не короче 8 символов)", "acct.signedAs": "Вы вошли как", "acct.error": "Не удалось выполнить действие. Повторите попытку.",
  "acct.keepNote": "Мы храним только email и защищённый хеш пароля. Подтверждение email и восстановление пароля пока недоступны.", "acct.open": "Аккаунт и вход",
} as const;
export type AccountKey = keyof typeof accountRu;
export const accountEn: Record<AccountKey, string> = {
  "acct.title": "Account", "acct.text": "Sign up to keep your progress and open the app on any device. The anonymous progress of this browser is kept.",
  "acct.textIn": "You are signed in. Your progress is linked to your email.", "acct.register": "Sign up", "acct.login": "Sign in", "acct.logout": "Sign out",
  "acct.email": "Email", "acct.password": "Password (at least 8 characters)", "acct.signedAs": "Signed in as", "acct.error": "Could not complete the action. Please try again.",
  "acct.keepNote": "We store only your email and a secure password hash. Email confirmation and password recovery are not available yet.", "acct.open": "Account and sign-in",
};
// Қазақша: тіл иесі тексеруі қажет.
export const accountKk: Record<AccountKey, string> = {
  "acct.title": "Аккаунт", "acct.text": "Прогресті сақтау және қолданбаны кез келген құрылғыда ашу үшін тіркеліңіз. Осы браузердің анонимді прогресі сақталады.",
  "acct.textIn": "Сіз аккаунтқа кірдіңіз. Прогресс email-ге байланған.", "acct.register": "Тіркелу", "acct.login": "Кіру", "acct.logout": "Шығу",
  "acct.email": "Email", "acct.password": "Құпиясөз (кемінде 8 таңба)", "acct.signedAs": "Сіз кірдіңіз", "acct.error": "Әрекетті орындау мүмкін болмады. Қайталап көріңіз.",
  "acct.keepNote": "Біз тек email мен құпиясөздің қорғалған хешін сақтаймыз. Email растау және құпиясөзді қалпына келтіру әзірге қолжетімсіз.", "acct.open": "Аккаунт және кіру",
};
