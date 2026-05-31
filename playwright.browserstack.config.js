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
  // the wrong shape for them. Run just the smoke canary — "does MP3 actually
  // decode and play on this real device" — with no retries so failures surface
  // fast rather than 3x into the job timeout.
  grep: /@smoke/,
  retries: 0,
  projects: [{ name: "browserstack" }],
})
