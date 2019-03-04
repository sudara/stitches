module.exports = {
  'Page Loads': (browser) => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent('body', 1000)
      .assert.title('StitchES6')
      .end()
  },
  'StichES6 logs properly': (browser) => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent('#debug', 1000)
      .assert.containsText('#debug','nodepool:create')
      .end()
  },
  'Clicking Anywhere unlocks audio': (browser) => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent('body', 1000)
      .click('#logo')
      .pause(500)
      .assert.containsText('#debug', 'node:unlocked')
      .end()
  }
}
