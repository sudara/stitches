module.exports = {
  afterEach: (browser, done) => {
    // eslint-disable-next-line global-require
    require("../../nightwatch-browserstack").updateStatusIfBrowserstack(browser, done)
    done()

  },
  "Next track starts once one has ended": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("#debug")
      .click("#track1 svg")
      .assert.textContains("#debug", "nodepool:create")
      // checks for preloading the second track
      .assert.textContains(
        "#debug",
        "audioNode:loaded - short-continuous-2.mp3"
      )
      .assert.playing(0.3, "short-continuous-2.mp3")
  },

  "Playlist still plays next track when in background tab": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("#debug")
      .click("#track1 svg")
      .assert.textContains("#debug", "track:playing")
      .openNewWindow('tab')
      .windowHandles(function(result) {
        this.switchWindow(result.value[1])
        this.pause(5000)
        this.switchWindow(result.value[0])
      })
      .assert.playing(2, "short-continuous-2.mp3")
  },

  "Playlist ends automatically after the last track": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("#debug")
      .click("#track3 svg")
      .assert.playing(1.0, "short-continuous-3.mp3")
      .assert.textContains("#debug", "track:ended")
      .pause(200) // whilePlaying can fire one more time, let's prevent glitch
      .cleanDebug()
      .assert.not.textContains("#debug", "whilePlaying")
  },

  "Playlist can contain the same track multiple times": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("#debug")
      .click("#playlist2-track1 svg") // this playlist has two tracks with same mp3 in it
      .assert.playing(1.0, "short-continuous-1.mp3")
      .pause(4000)
      .cleanDebug()
      .assert.playing(1.0, "short-continuous-1.mp3") // We should see this mp3 cross the 1.0 second mark again
  }
}
