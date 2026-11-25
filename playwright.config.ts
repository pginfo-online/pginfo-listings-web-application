import { defineConfig } from "@playwright/test";

const fixture = "http://127.0.0.1:3105";
const web = "http://127.0.0.1:3106";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.e2e.spec.ts",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { baseURL: web, browserName: "chromium", trace: "retain-on-failure" },
  webServer: [
    {
      command: "node tests/fixture-api.mjs",
      url: fixture,
      reuseExistingServer: false,
    },
    {
      command: "npm run start -- --hostname 127.0.0.1 --port 3106",
      url: web,
      env: { BACKEND_API_URL: fixture + "/api/v1", SITE_URL: web },
      reuseExistingServer: false,
    },
  ],
});
