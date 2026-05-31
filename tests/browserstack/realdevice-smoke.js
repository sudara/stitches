import { Builder, By } from "selenium-webdriver"
import browserstack from "browserstack-local"

// Real-device smoke lane (iOS Safari + Android Chrome) via BrowserStack.
//
// This exists because Playwright cannot prove iOS playback: it drives WebKit
// over the remote inspector protocol, and its synthesized click/tap never
// grants iOS Safari's media user-activation, so play() throws NotAllowedError
// even on a bare <audio>. Selenium + Appium's nativeWebTap performs a real
// OS-level XCUITest tap, which IS a trusted gesture, so play() is allowed.
// Android is permissive enough that a WebDriver click already works.
//
// Needs BROWSERSTACK_USERNAME + BROWSERSTACK_ACCESS_KEY and a local
// http-server on :8080. Run: npm run browserstack

const USERNAME = process.env.BROWSERSTACK_USERNAME
const ACCESS_KEY = process.env.BROWSERSTACK_ACCESS_KEY
const HUB = "https://hub-cloud.browserstack.com/wd/hub"
// On a real device "localhost" is the device; BrowserStack Local tunnels the
// host's server under bs-local.com.
const BASE = "http://bs-local.com:8080"
const FIXTURE = `${BASE}/tests/fixtures/player-queue.html`
// Pause/resume and seek need a track long enough to have headroom mid-playback
// (must be ≥ ~16s: seek 0.6 + the +3s assertion); the fixture's short-continuous
// clips are ~5s. Re-queued without a new tap, which also proves the unlock
// persists across queues. Distinct ids per check so events can't bleed across.
const LONG = { url: "/mp3/continuous-play-1.mp3", title: "continuous-play-1" }
const PAUSE_TRACK = { id: 91, ...LONG }
const SEEK_TRACK = { id: 92, ...LONG }

// BrowserStack device/version strings drift over time — adjust against the
// current BrowserStack capability builder if a session fails to start.
const DEVICES = [
  {
    name: "iOS Safari",
    caps: {
      browserName: "safari",
      "bstack:options": { deviceName: "iPhone 15", osVersion: "17", realMobile: "true" },
      "appium:nativeWebTap": true,
    },
  },
  {
    name: "Android Chrome",
    caps: {
      browserName: "chrome",
      "bstack:options": { deviceName: "Google Pixel 8", osVersion: "14.0", realMobile: "true" },
    },
  },
]

// Injected before the tap. The pool's <audio> elements are detached from the
// DOM, so we observe playback through the player:* CustomEvents instead.
function installRecorder() {
  if (window.__recorderInstalled) return
  window.__recorderInstalled = true
  window.__events = []
  const orig = EventTarget.prototype.dispatchEvent
  EventTarget.prototype.dispatchEvent = function (event) {
    if (event && typeof event.type === "string" && event.type.startsWith("player:")) {
      const d = event.detail || {}
      window.__events.push({
        type: event.type,
        id: d.track && d.track.id,
        ct: d.currentTime,
      })
    }
    return orig.call(this, event)
  }
}

// Pure, args-only so they serialize cleanly to the device via executeScript.
function playedPast(id, t) {
  return (window.__events || []).some(
    (e) =>
      (e.type === "player:playing" || e.type === "player:timeupdate") &&
      e.id === id &&
      typeof e.ct === "number" &&
      e.ct > t,
  )
}

function sawEvent(type, id) {
  return (window.__events || []).some((e) => e.type === type && (id == null || e.id === id))
}

function maxTime(id) {
  return (window.__events || []).reduce(
    (m, e) => (e.id === id && typeof e.ct === "number" && e.ct > m ? e.ct : m),
    0,
  )
}

function poll(driver, fn, message, timeout, ...args) {
  return driver.wait(() => driver.executeScript(fn, ...args), timeout, message, 1_000)
}

const setQueue = (driver, track) =>
  driver.executeScript((t) => window.player.setQueue([t], { autoplay: true }), track)
const playerCall = (driver, method) => driver.executeScript((m) => window.player[m](), method)
const clearEvents = (driver) =>
  driver.executeScript(() => {
    window.__events = []
  })

function buildDriver(device) {
  return new Builder()
    .usingServer(HUB)
    .withCapabilities({
      ...device.caps,
      "bstack:options": {
        ...device.caps["bstack:options"],
        userName: USERNAME,
        accessKey: ACCESS_KEY,
        local: "true",
        projectName: "stitches",
        buildName: process.env.BUILD_NAME || "stitches real-device smoke",
        sessionName: device.name,
      },
    })
    .build()
}

async function runSmoke(device) {
  const driver = await buildDriver(device)

  try {
    // unlock + play: a real gesture unlocks the pool and track 1 decodes + plays
    await driver.get(FIXTURE)
    await poll(
      driver,
      () => typeof window.player !== "undefined" && !!document.querySelector("#play"),
      "player module never initialized",
      30_000,
    )
    await driver.executeScript(installRecorder)
    // nativeWebTap turns this into a real OS tap on iOS = trusted gesture.
    await driver.findElement(By.id("play")).click()
    await poll(driver, playedPast, "track 1 never played past 0.3s", 45_000, 1, 0.3)

    // gapless advance: track 1 reaches its natural end and the preloaded next
    // track auto-advances and plays with NO new gesture (the core promise)
    await poll(driver, sawEvent, "track 1 never ended", 45_000, "player:ended", 1)
    await poll(driver, playedPast, "track 2 never auto-advanced past 0.3s", 30_000, 2, 0.3)

    // pause + resume mid-track without a new gesture
    await clearEvents(driver)
    await setQueue(driver, PAUSE_TRACK)
    await poll(driver, playedPast, "long track never played past 0.8s", 45_000, PAUSE_TRACK.id, 0.8)
    await playerCall(driver, "pause")
    await poll(driver, sawEvent, "pause never took effect", 15_000, "player:paused", null)
    // snapshot after pause confirmed so any residual timeupdate is in the baseline
    const beforePause = await driver.executeScript(maxTime, PAUSE_TRACK.id)
    await playerCall(driver, "play")
    await poll(
      driver,
      playedPast,
      "playback did not resume after pause",
      20_000,
      PAUSE_TRACK.id,
      beforePause + 0.5,
    )

    // seek-then-play: a forward seek lands and playback continues from there
    await clearEvents(driver)
    await setQueue(driver, SEEK_TRACK)
    await poll(driver, playedPast, "long track never played before seek", 45_000, SEEK_TRACK.id, 0.3)
    const beforeSeek = await driver.executeScript(maxTime, SEEK_TRACK.id)
    await driver.executeScript((p) => window.player.seek(p), 0.6)
    await poll(driver, sawEvent, "seek never fired", 15_000, "player:seeked", SEEK_TRACK.id)
    await poll(
      driver,
      playedPast,
      "playback did not continue past the seek point",
      20_000,
      SEEK_TRACK.id,
      beforeSeek + 3,
    )

    await driver.executeScript(
      'browserstack_executor: {"action":"setSessionStatus","arguments":{"status":"passed","reason":"unlock, gapless advance, pause/resume, seek"}}',
    )
  } finally {
    await driver.quit()
  }
}

async function main() {
  if (!USERNAME || !ACCESS_KEY) {
    console.error("Missing BROWSERSTACK_USERNAME / BROWSERSTACK_ACCESS_KEY")
    process.exit(2)
  }

  const bsLocal = new browserstack.Local()
  await new Promise((resolve, reject) =>
    bsLocal.start({ key: ACCESS_KEY }, (e) => (e ? reject(e) : resolve())),
  )

  const failures = []
  try {
    for (const device of DEVICES) {
      try {
        await runSmoke(device)
        console.log(`PASS ${device.name}`)
      } catch (e) {
        failures.push(device.name)
        console.error(`FAIL ${device.name}: ${e.message}`)
      }
    }
  } finally {
    await new Promise((resolve) =>
      bsLocal.stop((e) => {
        if (e) console.error(`tunnel stop failed: ${e.message}`)
        resolve()
      }),
    )
  }

  if (failures.length) {
    console.error(`\n${failures.length}/${DEVICES.length} failed: ${failures.join(", ")}`)
    process.exit(1)
  }
  console.log(`\nAll ${DEVICES.length} real-device smokes passed`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
