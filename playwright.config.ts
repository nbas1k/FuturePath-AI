import { defineConfig, devices } from "@playwright/test";

// E2E: поднимает dev-сервер (или использует уже запущенный) и гоняет сценарии на телефоне и компьютере.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3001", trace: "retain-on-failure" },
  webServer: { command: "npm run dev", url: "http://localhost:3001", reuseExistingServer: true, timeout: 120_000 },
  projects: [
    { name: "mobile-320", use: { ...devices["Pixel 5"], viewport: { width: 320, height: 640 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
});
