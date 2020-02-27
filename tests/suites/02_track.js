module.exports = {
  afterEach: (browser, done) => {
    // eslint-disable-next-line global-require
    require("../../nightwatch-browserstack").updateStatusIfBrowserstack(browser, done)
  },

  "Clicking play on a preloaded track starts audio": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body")
      .click("#track1")
      .assert.containsText("#debug", "nodepool:create")
      .assert.containsText("#debug", "audioNode:unlockedpreloaded")
      .assert.playing()
      .assert.progressBarMoved("li:nth-of-type(1) > progress")
  },

  "Clicking play on a non-preloaded track starts audio": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body")
      .click("#track2")
      .assert.containsText("#debug", "nodepool:create")
      .assert.playing()
      .assert.progressBarMoved("li:nth-of-type(2) > progress")
  },

  "Clicking play on a track AFTER manually unlocking also starts audio": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body")
      .click("#logo") // unlock audio
      .waitForElementPresent("#debug")
      .click("li:nth-of-type(1) > a")
      .assert.containsText("#debug", "nodepool:create")
      .assert.playing()
  },

  "Clicking play, pause and play on a track resumes playback": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("#debug")
      .click("li:nth-of-type(2) > a")
      .assert.playing()
      .click("li:nth-of-type(2) > a")
      .assert.containsText("#debug", "track:pause")
      .cleanDebug()
      .assert.not.containsText("#debug", "whilePlaying")
      .click("li:nth-of-type(2) > a")
      .assert.playing(1)
  }
}
