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
    browser .url(browser.launchUrl)
      .waitForElementPresent("body")
      .click("#track404 svg")
      .assert.not.playing()
      .assert.containsText("#debug", "FIRED: onError Callback")
  },

  "<progress> element updates during playback" : browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body")
      .click("#track1 svg")
      .assert.progressBarMoved("#track1progress")
  },

  "Custom defined progress elements update their width": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body")
      .click("#playlist2-track1 svg")
      .assert.progressBarMoved("#customProgress")
  },

  "The time updates at the start of playback" : browser => {
    browser
      .url(browser.launchUrl)
      .click("#track1 svg")

      // Some browsers take too long to run the next assertion
      // So we must pause here so we don't drift into 0:01 etc
      // But that's not possible either, so we have to accept
      // Sometimes the time will be 0:001
      .click("#track1 svg")
      .assert.containsText("#track1time", "0:0")
  },

  "The time updates during playback": browser => {
    browser
      .url(browser.launchUrl)
      .click("#track1 svg")
      .assert.timeUpdated("#track1time", "0:01")
  },

  "Seeking works and doesn't reload track": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body")
      .click("#track1 svg") // play

       // wait long enough for next track to start loading
       // important because it fires src:changed
       // which we are looking for later
      .assert.containsText('#debug', 'audioNode:srcchanged - short-continuous-2.mp3')
      .assert.containsText('#debug', 'audioNode:whileLoading')
      .click("#track1 svg") // pause
      .cleanDebug()
      .click("#track1progress") // seek to 50% through (and start play)

      // stop playing right after seek
      // this is important because we want to assert we seeked
      // into the track vs. just played it through 2 seconds
      .click("#track1 svg") // pause
      .assert.containsText('#debug', 'audioNode:seeked')
      .assert.containsText('#debug', 'track:playing')
      .assert.not.containsText('#debug', 'audioNode:srcchanged')
      .assert.not.containsText('#debug', 'audioNode:whileLoading')
      .assert.playing(2.0) // assumes test tracks are more than 4 seconds long
  },

  "Seeking during playback doesn't trigger play callbacks": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body")
      .click("#track1 svg") // play
      .assert.containsText('#debug', 'track:playing')
      .cleanDebug()
      .click("#track1progress") // seek
      .click("#track1 svg") // pause
      .assert.containsText('#debug', 'audioNode:seeked')
      .assert.containsText('#debug', 'track:seeked')
      .assert.not.containsText('#debug', 'track:playing')
  },

  "A listen is registered after 15 percent of the track is complete": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body")
      .click("#track1 svg") // play
      .assert.not.containsText('#debug', 'track:registerListen')
      .pause(1500)
      .click("#track1 svg") // pause
      // ideally we'd test this doesn't fire beforehand,
      // but 15% of 4 seconds is very fast, so this was producing flakey tests
      .assert.containsText('#debug', 'track:registerListen')
  }
}
