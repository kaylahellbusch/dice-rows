import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:3107",
    viewport: { width: 375, height: 812 },
  },
  webServer: {
    command: "PORT=3107 npm run dev",
    url: "http://127.0.0.1:3107",
    reuseExistingServer: false,
  },
  reporter: "list",
});
