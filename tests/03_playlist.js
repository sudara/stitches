module.exports = {
  afterEach: (browser, done) => {
    // eslint-disable-next-line global-require
    require(".././nightwatch-browserstack").updateStatusIfBrowserstack(browser, done)
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
    browser.expect
      .element("#debug")
      .text.to.match(/whilePlaying - \d\.\d+ short-continuous-1\.mp3/)
    browser.expect
      .element("#debug")
      .text.to.match(/whilePlaying - \d\.\d+ short-continuous-2\.mp3/)
    browser.assert
      .containsText("#debug", "audioNode:loaded - short-continuous-3.mp3") // checks for preloading the third one
      .end()
  },
  "Playlist ends automatically after the last track": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("#debug")
      .click("li:nth-of-type(4) > a")
    browser.expect
      .element("#debug")
      .text.to.match(/whilePlaying - \d\.\d+ short-continuous-4\.mp3/)
    browser
      .pause(2000)
      .assert.containsText("#debug", "track:ended")
      .end()
  },
  "Playlist can contain the same track multiple times": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("#debug")
      .click("#playlist2 li:nth-of-type(1) > a")
    browser.expect
      .element("#debug")
      .text.to.match(/whilePlaying - \d\.\d+ short-continuous-1\.mp3/)
    browser.pause(3000).execute(function cleanDebug() {
      document.getElementById("debug").innerHTML = ""
    })
    browser.expect
      .element("#debug")
      .text.to.match(/whilePlaying - 1\.\d+ short-continuous-1\.mp3/)
    browser.end()
  }
}
