module.exports = {
  afterEach: (browser, done) => {
    // eslint-disable-next-line global-require
    require("../../nightwatch-browserstack").updateStatusIfBrowserstack(browser, done)
  },

  "Clicking play on a preloaded track starts audio": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body")
      .click("#track1 svg")
      .assert.containsText("#debug", "nodepool:create")
      .assert.containsText("#debug", "audioNode:alreadyUnlockedDirectly")
      .assert.playing()
      .assert.progressBarMoved("#track1progress")
  },

  "Clicking play on a non-preloaded track starts audio": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body")
      .click("#track2 svg")
      .assert.containsText("#debug", "nodepool:create")
      .assert.playing()
      .assert.progressBarMoved("#track2progress")
  },

  "The whilePlaying callback gets called" : browser => {
    browser.url(browser.launchUrl)
      .waitForElementPresent("body")
      .click("#playlist2-track1 svg")
      .assert.playing()
      .assert.containsText("#debug", "FIRED: whilePlaying Callback")
    },

    "The onError callback gets called" : browser => {
    browser.url(browser.launchUrl)
      .waitForElementPresent("body")
      .click("#track404 svg")
      .assert.not.playing()
      .assert.containsText("#debug", "FIRED: onError Callback")
  },

  "Clicking play, pause and play on a track resumes playback": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("#debug")
      .click("#track2 svg")
      .assert.playing()
      .click("#track2 svg")
      .assert.containsText("#debug", "track:pause")
      .cleanDebug()
      .assert.not.containsText("#debug", "whilePlaying")
      .click("#track2 svg")
      .assert.playing(1)
  }
}
