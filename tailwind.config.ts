import type { Config } from "tailwindcss";

// Дизайн-система «линейка навыков»: холодная бумага, тёмные чернила, сигнальный сине-зелёный и жёлтый маркер.
// Старые названия цветов (slate, indigo, violet) переопределены, поэтому все компоненты получают новую палитру без правки разметки:
//   slate  — холодная бумага и чернила,
//   indigo — сигнальный сине-зелёный (главный акцент, «после»),
//   violet — светлый тон того же акцента (для полос прогресса),
//   marker — жёлтый маркер: отмечает измеренное улучшение (используется редко).
// Тёмная тема включается классом "dark" на <html>.
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Golos Text"', "system-ui", "Segoe UI", "Arial", "sans-serif"],
        display: ['"Geologica"', '"Golos Text"', "system-ui", "Segoe UI", "Arial", "sans-serif"],
      },
      colors: {
        slate: { 50: "#F4F6F8", 100: "#E9EEF2", 200: "#D5DDE4", 300: "#B7C3CD", 400: "#8797A4", 500: "#5B6B78", 600: "#435361", 700: "#2F3D49", 800: "#1C2A35", 900: "#121D26", 950: "#0A1218" },
        indigo: { 50: "#EAF4F4", 100: "#D2E8E8", 200: "#A9D2D3", 300: "#75B5B8", 400: "#4FB3A9", 500: "#1F7479", 600: "#14595F", 700: "#0F4548", 800: "#0D3739", 900: "#0B2B2E", 950: "#061B1E" },
        violet: { 50: "#EEF7F5", 100: "#D9EEEA", 200: "#B5DDD6", 300: "#8CCABF", 400: "#66B8AB", 500: "#4FB3A9", 600: "#2F9087", 700: "#26746D", 800: "#215C57", 900: "#1D4B47", 950: "#0F2B29" },
        marker: { DEFAULT: "#FFD84D", soft: "#FFF3BF", ink: "#5C4700" },
        brand: { 400: "#4FB3A9", 500: "#1F7479", 600: "#14595F" },
      },
      letterSpacing: { display: "-0.02em" },
    },
  },
  plugins: [],
};
export default config;
