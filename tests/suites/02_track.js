module.exports = {
  afterEach: (browser, done) => {
    // eslint-disable-next-line global-require
    require("../../nightwatch-browserstack").updateStatusIfBrowserstack(browser, done)
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

  "The progress bar moves during playback" : browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body")
      .click("#track1 svg")
      .assert.progressBarMoved("#track1progress")
  },

  "The time updates at the start of playback" : browser => {
    browser
      .url(browser.launchUrl)
      .click("#track1 svg")
      .assert.timeUpdated("#track1time", "0:00")
  },

  "The time updates during playback": browser => {
    browser
      .url(browser.launchUrl)
      .click("#track1 svg")
      .assert.timeUpdated("#track1time", "0:01")
  }

}
