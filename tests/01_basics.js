module.exports = {
  afterEach: (browser, done) => {
    // eslint-disable-next-line global-require
    require(".././nightwatch-browserstack").updateStatusIfBrowserstack(browser, done)
  },
  "Page Loads": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body")
      .assert.title("StitchES6")
  },
  "StichES6 logs properly": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("#debug")
      .assert.containsText("#debug", "nodepool:create")
  },
  "Clicking Anywhere unlocks audio": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body")
      .click("#logo")
      .pause(500)
      .assert.containsText("#debug", "audioNode:unlocked")
  }
}
