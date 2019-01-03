module.exports = {
  'Clicking play on a track starts audio': (browser) => {
    browser
      .url(browser.launchUrl)
      .waitForElementVisible('#debug', 500)
      .click('a.track:nth-of-type(1)')
      .assert.containsText('#debug', 'nodepool:create')
      .pause(2000)
      .assert.containsText('#debug', 'playing: 2')
      .end()
  },
  'Clicking play on a track after clicking anywhere starts audio': (browser) => {
    browser
      .url(browser.launchUrl)
      .waitForElementVisible('#logo', 500)
      .click('#logo')
      .waitForElementVisible('#debug', 500)
      .click('a.track:nth-of-type(1)')
      .assert.containsText('#debug', 'nodepool:create')
      .pause(2000)
      .assert.containsText('#debug', 'playing: 2')
      .end()
  }
}
