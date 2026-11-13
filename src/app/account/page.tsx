import { currentUser } from "@/backend/session";
import { AccountForm } from "@/components/AccountForm";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "FuturePath AI" };

export default async function AccountPage() {
  const { t } = await getT();
  const user = await currentUser();
  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="text-2xl font-extrabold">{t("acct.title")}</h1>
      <p className="text-slate-600 dark:text-slate-400">{t(user ? "acct.textIn" : "acct.text")}</p>
      <AccountForm email={user?.email ?? null} />
    </div>
  );
}
