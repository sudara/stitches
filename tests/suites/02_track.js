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
      .assert.containsText("#track1time", "0:00")
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
      .pause(500)
      .click("#track1 svg") // pause
      .cleanDebug()
      .click("#track1progress") // seek (and start play)
      .assert.containsText('#debug', 'audioNode:seek')
      .assert.containsText('#debug', 'track:playing')

      // stop playing right after seek
      // this is important because we want to assert we seeked
      // into the track vs. just played it longer
      .pause(50)
      .assert.not.containsText('#debug', 'audioNode:srcchanged')
      .assert.not.containsText('#debug', 'audioNode:whileLoading')
      .click("#track1 svg") // pause
      .assert.playing(2.0) // assumes test tracks are more than 4 seconds long

      // Verify that seeking while playing doesn't trigger the "play" callback
      .click("#track1 svg") // play
      .assert.containsText('#debug', 'track:playing')
      .cleanDebug()
      .click("#track1progress") // seek
      .pause(50)
      .click("#track1 svg") // pause
      .assert.containsText('#debug', 'audioNode:seek')
      //.assert.not.containsText('#debug', 'track:playing')
  }
}
