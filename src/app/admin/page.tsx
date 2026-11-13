import { adminEnabled, isAdmin } from "@/backend/admin";
import { AdminPanel } from "@/components/AdminPanel";
import { AdminLogin } from "@/components/AdminLogin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Админ-панель", robots: { index: false, follow: false } };

export default async function AdminPage() {
  if (!adminEnabled()) return <p role="alert" className="rounded-2xl bg-slate-100 p-4 font-semibold dark:bg-slate-800">Админ-панель отключена: не задан ADMIN_SECRET на сервере.</p>;
  return (await isAdmin()) ? <AdminPanel /> : <AdminLogin />;
}
