// Образовательные ресурсы. В список включены только известные публичные сайты, адреса которых мы открыли и проверили на доступность.
// Мы не пишем цены, сроки и обещания: условия (бесплатно или платно, язык) смотрите на самом сайте.
export const RESOURCES_CHECKED = "2026-11-09";

export type Resource = { name: string; url: string; what: string; forProfessions?: string[] };

export const RESOURCES: Resource[] = [
  { name: "MDN Web Docs (на русском)", url: "https://developer.mozilla.org/ru/", what: "Справочник по веб-технологиям: HTML, CSS, JavaScript", forProfessions: ["software-developer", "ux-designer"] },
  { name: "freeCodeCamp", url: "https://www.freecodecamp.org/", what: "Практические уроки по программированию", forProfessions: ["software-developer"] },
  { name: "CS50 (Harvard)", url: "https://cs50.harvard.edu/x/", what: "Вводный курс по информатике", forProfessions: ["software-developer"] },
  { name: "W3C: основы доступности", url: "https://www.w3.org/WAI/fundamentals/accessibility-intro/", what: "Что такое доступность интерфейсов и зачем она нужна", forProfessions: ["ux-designer"] },
  { name: "Nielsen Norman Group: шпаргалка по UX-исследованиям", url: "https://www.nngroup.com/articles/ux-research-cheat-sheet/", what: "Какие методы исследований подходят для разных задач", forProfessions: ["ux-designer"] },
  { name: "Microsoft Learn", url: "https://learn.microsoft.com/ru-ru/training/", what: "Учебные модули по технологиям и данным", forProfessions: ["software-developer", "marketer"] },
  { name: "Khan Academy", url: "https://www.khanacademy.org/", what: "Школьная и университетская база: математика, наука, экономика" },
  { name: "Stepik", url: "https://stepik.org/", what: "Платформа с русскоязычными курсами по разным темам" },
  { name: "Coursera", url: "https://www.coursera.org/", what: "Онлайн-курсы университетов и компаний" },
  { name: "edX", url: "https://www.edx.org/", what: "Онлайн-курсы университетов" },
  { name: "IBM SkillsBuild", url: "https://skillsbuild.org/", what: "Учебные материалы по технологиям и профессиональным навыкам" },
];

export function resourcesFor(professionId: string): Resource[] {
  return RESOURCES.filter((r) => !r.forProfessions || r.forProfessions.includes(professionId));
}
