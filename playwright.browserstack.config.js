import { defineConfig } from "@playwright/test"
import base from "./playwright.config.js"

// BrowserStack provides the browser remotely (via browserstack-node-sdk), so we
// collapse the local per-engine projects into one and let browserstack.yml's
// platforms fan it out across real devices. Run via: npm run browserstack
export default defineConfig({
  ...base,
  // On a real device "localhost" is the device itself; BrowserStack Local
  // tunnels the host's server under bs-local.com, so point the tests there.
  use: { ...base.use, baseURL: "http://bs-local.com:8080" },
  // Real devices over the tunnel are slow, and the full desktop-tuned suite is
  // the wrong shape for them. Run only the smoke suite (unlock/play/next) with
  // no retries so failures surface fast rather than 3x into the job timeout.
  testMatch: /smoke\.spec\.js/,
  retries: 0,
  projects: [{ name: "browserstack" }],
})
