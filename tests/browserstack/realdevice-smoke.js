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

function playedPast(id) {
  return (window.__events || []).some(
    (e) =>
      (e.type === "player:playing" || e.type === "player:timeupdate") &&
      e.id === id &&
      typeof e.ct === "number" &&
      e.ct > 0.3,
  )
}

async function waitForPlaying(driver, id) {
  await driver.wait(
    () => driver.executeScript(playedPast, id),
    45_000,
    `track ${id} never played past 0.3s`,
    1_000,
  )
}

async function runSmoke(device) {
  const driver = await new Builder()
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

  try {
    await driver.get(FIXTURE)
    await driver.wait(
      () =>
        driver.executeScript(
          () => typeof window.player !== "undefined" && !!document.querySelector("#play"),
        ),
      30_000,
      "player module never initialized",
    )
    await driver.executeScript(installRecorder)

    // nativeWebTap turns this into a real OS tap on iOS = trusted gesture.
    await driver.findElement(By.id("play")).click()
    await waitForPlaying(driver, 1)

    await driver.executeScript(() => window.player.next())
    await waitForPlaying(driver, 2)

    await driver.executeScript(
      'browserstack_executor: {"action":"setSessionStatus","arguments":{"status":"passed","reason":"unlock + play + next"}}',
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
