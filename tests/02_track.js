module.exports = {
  // this is so ugly, but the only way we can get failures to report properly
  afterEach: (browser, done) => {
    if (browser.launchUrl.includes("bs-local")) {
      // eslint-disable-next-line global-require
      require("../nightwatch-browserstack").updateStatus(browser)
    }
    done()
  },

  "Clicking play on a track starts audio": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body")
      .click("#track1")
      .assert.containsText("#debug", "nodepool:create")
      .pause(1500)
      .assert.containsText("#debug", "whilePlaying - 1")
      .end()
  },
  "Clicking play on a track after clicking anywhere starts audio": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body")
      .click("#logo")
      .waitForElementPresent("#debug", 1000)
      .click("a.track:nth-of-type(1)")
      .assert.containsText("#debug", "nodepool:create")
      .pause(1500)
      .assert.containsText("#debug", "whilePlaying - 1")
      .end()
  }
}
