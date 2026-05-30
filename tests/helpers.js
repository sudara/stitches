import { expect } from "@playwright/test"

// Every stitches event goes through Log.trigger as a bubbling CustomEvent.
// We wrap dispatchEvent so tests assert against real events instead of
// scraping text out of the #debug element (the old Nightwatch approach).
export async function openPlayer(page) {
  await page.addInitScript(() => {
    window.__stitchesEvents = []
    const origDispatch = EventTarget.prototype.dispatchEvent
    EventTarget.prototype.dispatchEvent = function (event) {
      if (event instanceof CustomEvent) {
        window.__stitchesEvents.push({ type: event.type, detail: event.detail })
      }
      return origDispatch.call(this, event)
    }
  })
  await page.goto("/tests/fixtures/player.html")
}

export function events(page) {
  return page.evaluate(() => window.__stitchesEvents)
}

export function callbacks(page) {
  return page.evaluate(() => window.__callbacks)
}

export function clearEvents(page) {
  return page.evaluate(() => {
    window.__stitchesEvents = []
  })
}

export async function expectEvent(page, type) {
  await expect
    .poll(async () => (await events(page)).some((e) => e.type === type), {
      message: `expected a "${type}" event`,
    })
    .toBe(true)
}

export async function expectNoEvent(page, type) {
  expect((await events(page)).some((e) => e.type === type)).toBe(false)
}

// Asserts the track produced audio that played past `past` seconds — the
// canary that MP3 actually decoded (no codec = currentTime never advances).
export async function expectPlaying(
  page,
  { past = 0.3, fileName = null } = {},
) {
  await expect
    .poll(
      async () => {
        const evts = await events(page)
        return evts.some((e) => {
          if (e.type !== "track:playing" && e.type !== "track:whilePlaying")
            return false
          if (fileName && e.detail?.fileName !== fileName) return false
          return typeof e.detail?.time === "number" && e.detail.time > past
        })
      },
      {
        timeout: 15_000,
        message: `expected playback past ${past}s${fileName ? ` of ${fileName}` : ""}`,
      },
    )
    .toBe(true)
}

// updatePlayProgressElement sets `.value` (0..1) on PROGRESS nodes and
// `style.width` ("NN%") on everything else; we read whichever applies as a
// fraction and assert it crossed `past`. The default <progress> doubles as the
// loading bar, which can already read 1 before play starts, so this matches the
// old assertion's intent (the bar reflects real progress) rather than growth.
export async function expectProgressMoved(page, selector, past = 0.1) {
  await expect
    .poll(
      () =>
        page.locator(selector).evaluate((el) => {
          if (el.nodeName === "PROGRESS") return el.value
          return parseFloat(el.style.width) / 100
        }),
      {
        timeout: 15_000,
        message: `expected ${selector} to advance past ${past}`,
      },
    )
    .toBeGreaterThan(past)
}

// Time text is clock-formatted "m:ss". Playback resets the element to "0:00"
// then counts up, so we parse to total seconds — this rejects the static "1:23"
// placeholder (83s) and asserts real playback reached at least `expected`. Some
// browsers are choppy, hence >= rather than an exact match.
export async function expectTimeUpdated(page, selector, expected) {
  const totalSeconds = (text) => {
    const [min, sec] = text.trim().split(":").map(Number)
    return min * 60 + sec
  }
  const target = totalSeconds(expected)
  await expect
    .poll(
      async () => {
        const text = (await page.locator(selector).textContent()).trim()
        return text.startsWith("0:") ? totalSeconds(text) : -1
      },
      {
        timeout: 15_000,
        message: `expected ${selector} to reach ${expected}`,
      },
    )
    .toBeGreaterThanOrEqual(target)
}
