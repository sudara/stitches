module.exports = {
  afterEach: (browser, done) => {
    // eslint-disable-next-line global-require
    require("../../nightwatch-browserstack").updateStatusIfBrowserstack(browser, done)
  },
  "Next track starts once one has ended": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("#debug")
      .click("a.track:nth-of-type(1)")
      .assert.containsText("#debug", "nodepool:create")
      .assert.containsText(
        "#debug",
        "audioNode:loaded - short-continuous-2.mp3"
      ) // checks for preloading the second one
      .assert.playing(1.0, "short-continuous-1.mp3")
      .assert.playing(0.3, "short-continuous-2.mp3")
      .assert
      .containsText("#debug", "audioNode:loaded - short-continuous-3.mp3") // checks for preloading the third one
  },

  "Playlist ends automatically after the last track": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("#debug")
      .click("li:nth-of-type(4) > a")
      .assert.playing(1.0, "short-continuous-4.mp3")
      .assert.containsText("#debug", "track:ended")
      .cleanDebug()
      .pause(200) // whilePlaying can fire one more time, let's prevent glitch
      .assert.not.containsText("#debug", "whilePlaying")
  },

  "Playlist can contain the same track multiple times": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("#debug")
      .click("#playlist2 li:nth-of-type(1) > a") // this playlist has two tracks with same mp3 in it
      .assert.playing(1.0, "short-continuous-1.mp3")
      .pause(3000)
      .cleanDebug()
      .assert.playing(1.0, "short-continuous-1.mp3") // We should see this mp3 cross the 1.0 second mark again
  }
}
