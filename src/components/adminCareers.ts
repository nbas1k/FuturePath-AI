import { CAREERS } from "@/catalog/build";
export const CAREER_OPTIONS = CAREERS.map((c) => ({ id: c.id, title: c.titles.ru })).sort((a, b) => a.title.localeCompare(b.title, "ru"));
