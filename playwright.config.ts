import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  workers: 1,
  use: { baseURL: "http://localhost:5173" },
  webServer: {
    command: "npx vite --host 127.0.0.1",
    url: "http://localhost:5173",
    reuseExistingServer: false,
  },
});
