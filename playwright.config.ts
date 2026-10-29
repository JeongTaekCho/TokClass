import { defineConfig, devices } from "@playwright/test";

/**
 * E2E는 로컬 Supabase(supabase start + seed)와 .env.local이 준비돼 있어야 해요.
 * 실행: pnpm test:e2e  (이미 떠 있는 개발 서버가 있으면 그대로 사용)
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    // 미리 설치된 Chromium을 쓰고 싶으면 PLAYWRIGHT_CHROMIUM_PATH로 지정해요.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:3000/join",
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
