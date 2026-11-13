import { redirect } from "next/navigation";

// Старый адрес «Кабинет» перенаправляет в раздел «Профиль», чтобы старые ссылки не вели в тупик.
export default function CabinetRedirect() {
  redirect("/profile");
}
