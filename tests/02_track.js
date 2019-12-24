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
      .getAttribute("li:nth-of-type(1) > progress", "value", result => {
        browser.assert.ok(parseFloat(result.value) > 0.2)
      })
      .end()
  },
  "Clicking play on a track after clicking to unlock starts audio": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body")
      .click("#logo") // unlock audio
      .pause(500)
      .waitForElementPresent("#debug")
      .click("li:nth-of-type(1) > a")
      .assert.containsText("#debug", "nodepool:create")
      .pause(1500)
      .assert.containsText("#debug", "whilePlaying - 1")
      .end()
  },
  "Clicking play, pause and play on a track resumes playback": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("#debug")
      .click("li:nth-of-type(2) > a")
      .pause(500)
      .assert.containsText("#debug", "whilePlaying - 0")
      .click("li:nth-of-type(2) > a")
      .assert.containsText("#debug", "track:pause")
      .execute(function cleanDebug() {
        document.getElementById("debug").innerHTML = ""
      })
    browser.expect.element("#debug").text.to.not.contain("whilePlaying - 1")
    browser
      .click("li:nth-of-type(2) > a")
      .pause(1500)
      .assert.containsText("#debug", "whilePlaying - 2")
      .end()
  }
}
