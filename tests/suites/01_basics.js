module.exports = {
  afterEach: (browser, done) => {
    // eslint-disable-next-line global-require
    require("../../nightwatch-browserstack").updateStatusIfBrowserstack(browser, done)
  },
  "StichES logs properly": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body")
      .assert.title("StitchES")
      .waitForElementPresent("#debug")
      .assert.containsText("#debug", "nodepool:create")
  },
  "Clicking Anywhere unlocks audio": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body")
      .click("#logo")
      .assert.containsText("#debug", "audioNode:unlocked")
  }
}
