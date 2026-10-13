import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/pages",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3002/sololevelup/",
    viewport: { width: 393, height: 851 },
    isMobile: true,
    hasTouch: true,
    timezoneId: "Asia/Seoul",
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
        (process.env.CI ? undefined : "/usr/bin/chromium"),
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "python scripts/serve-pages.py",
    url: "http://127.0.0.1:3002/sololevelup/",
  },
  reporter: "list",
});
