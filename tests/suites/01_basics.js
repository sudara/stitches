module.exports = {
  afterEach: (browser, done) => {
    // eslint-disable-next-line global-require
    require("../../nightwatch-browserstack").updateStatusIfBrowserstack(browser, done)
  },

  "StitchES logs properly": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body")
      .assert.title("StitchES")
      .waitForElementPresent("#debug")
      .assert.containsText("#debug", "nodepool:create")
  },
  
  "Logs to console": browser => {
    let consoleText;
    browser.getLog('browser', function(log) { consoleText=log.at(-1) })
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body")
      .assert.title("StitchES")
      .waitForElementPresent("#debug")
      .assert.containsText("#debug", consoleText)
  },

  "Clicking play on a preloaded track starts audio": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body")
      .click("#track1 svg")
      .assert.containsText("#debug", "nodepool:create")
      .assert.containsText("#debug", "audioNode:alreadyUnlockedDirectly")
      .assert.playing()

  },

  "Clicking play on a non-preloaded track starts audio": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body")
      .click("#track2 svg")
      .assert.containsText("#debug", "nodepool:create")
      .assert.playing()
  },

  "Clicking play, pause and play on a track resumes playback": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("#debug")
      .click("#track2 svg") // play
      .assert.playing(0.4) // verify it played through 400ms
      .click("#track2 svg") // pause
      .assert.containsText("#debug", "track:pause")
      .cleanDebug()
      .assert.not.containsText("#debug", "whilePlaying")
      .click("#track2 svg") // play
      .pause(250)
      .assert.not.containsText("#debug", "track:pause") // shouldn't have fired yet
      .click("#track2 svg") // pause
      .assert.playing(0.5) // verify it resumed, not restarted at 0.00
  }

}
