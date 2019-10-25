module.exports = {
  // this is so ugly, but the only way we can get failures to report properly
  afterEach: (browser, done) => {
    if (browser.launchUrl.includes("bs-local")) {
      // eslint-disable-next-line global-require
      require("../nightwatch-browserstack").updateStatus(browser)
    }
    done()
  },

  "Page Loads": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body", 1000)
      .assert.title("StitchES6")
      .end()
  },
  "StichES6 logs properly": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("#debug", 1000)
      .assert.containsText("#debug", "nodepool:create")
      .end()
  },
  "Clicking Anywhere unlocks audio": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body", 1000)
      .click("#logo")
      .pause(500)
      .assert.containsText("#debug", "audioNode:unlocked")
      .end()
  }
}
