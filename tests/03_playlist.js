module.exports = {
  // this is so ugly, but the only way we can get failures to report properly
  afterEach: (browser, done) => {
    if (browser.launchUrl.includes("bs-local")) {
      // eslint-disable-next-line global-require
      require("../nightwatch-browserstack").updateStatus(browser)
    }
    done()
  },

  "Next track starts once one has ended": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body")
      .click("#logo")
      .waitForElementPresent("#debug", 1000)
      .click("a.track:nth-of-type(1)")
      .assert.containsText("#debug", "nodepool:create")
      .pause(1500)
      .assert.containsText("#debug", "short-continuous-1.mp3")
      .pause(3000)
      .assert.containsText("#debug", "short-continuous-2.mp3")
      .end()
  },
  "Playlist ends automatically after the last track": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body")
      .waitForElementPresent("#debug", 1000)
      .click("li:nth-of-type(4) > a")
      .pause(1500)
      .assert.containsText("#debug", "short-continuous-4.mp3")
      .pause(3000)
      .assert.containsText("#debug", "audioNode:ended")
      .end()
  }
}
