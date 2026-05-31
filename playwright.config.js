import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npx http-server -s -p 8080 .",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    // Bundled Chromium ships without MP3/AAC; the real Chrome channel bundles
    // the codecs this library needs. This is the primary lane.
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        // headless Firefox on Linux CI blocks the gestureless programmatic
        // plays the Player relies on (next/jumpTo/auto-advance); allow autoplay
        // so we test our playback logic, not Firefox's autoplay policy
        launchOptions: {
          firefoxUserPrefs: {
            "media.autoplay.default": 0,
            "media.autoplay.blocking_policy": 0,
          },
        },
      },
    },
    // WebKit only decodes MP3 on macOS (system codecs); CI runs this project
    // on a macOS runner. On Linux it will fail to play and should be skipped.
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
})
