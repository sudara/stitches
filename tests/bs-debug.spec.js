import { test, expect } from "@playwright/test"

// TEMP first-principles debug for the real-iOS playback failure. Uses NO
// stitches — just a bare <audio> and a synchronous play() on click. If this
// advances currentTime on a real device, the problem is in our code (play()
// runs after an async grabNode(), losing the gesture); if not, it's the
// device/automation/tunnel. Always dumps the element's event log.

test.afterEach(async ({ page }, testInfo) => {
  const diag = await page.evaluate(() => window.__diag || [])
  console.log(`[RAWDIAG ${testInfo.title}] ${JSON.stringify(diag)}`)
})

test("raw <audio> synchronous play advances currentTime", async ({ page }) => {
  await page.goto("/tests/fixtures/bs-debug.html")
  await page.locator("#play").click()
  await expect
    .poll(() => page.locator("#audio").evaluate((a) => a.currentTime), {
      timeout: 30_000,
      message: "raw <audio> currentTime never advanced past 0.3s",
    })
    .toBeGreaterThan(0.3)
})
