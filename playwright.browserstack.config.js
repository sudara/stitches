import { defineConfig } from "@playwright/test"
import base from "./playwright.config.js"

// BrowserStack provides the browser remotely (via browserstack-node-sdk), so we
// collapse the local per-engine projects into one and let browserstack.yml's
// platforms fan it out across real devices. Run via: npm run browserstack
export default defineConfig({
  ...base,
  projects: [{ name: "browserstack" }],
})
