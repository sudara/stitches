module.exports = {
  // this is so ugly, but the only way we can get failures to report properly
  afterEach: function (browser, done) {
    if (browser.launchUrl.includes('bc-local')) {
      require('../nightwatch-browserstack').updateStatus(browser)
    }
    done()
  },

  'Clicking play on a track starts audio': (browser) => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent('body')
      .click('#track1')
      .assert.containsText('#debug', 'nodepool:create')
      .pause(3000)
      .assert.containsText('#debug', 'playing: 2')
      .end()
  },
  'Clicking play on a track after clicking anywhere starts audio': (browser) => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent('body')
      .click('#logo')
      .waitForElementPresent('#debug', 1000)
      .click('a.track:nth-of-type(1)')
      .assert.containsText('#debug', 'nodepool:create')
      .pause(3000)
      .assert.containsText('#debug', 'playing: 2')
      .end()
  }
}
