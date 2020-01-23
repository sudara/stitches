module.exports = {
  "Page Loads": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body")
      .assert.title("StitchES6")
      .end()
  },
  "StichES6 logs properly": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("#debug")
      .assert.containsText("#debug", "nodepool:create")
      .end()
  },
  "Clicking Anywhere unlocks audio": browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementPresent("body")
      .click("#logo")
      .pause(500)
      .assert.containsText("#debug", "audioNode:unlocked")
      .end()
  }
}
