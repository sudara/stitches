module.exports = {
  'Page Loads': (browser) => {
    browser
      .url(browser.launchUrl)
      .waitForElementVisible('body', 500)
      .assert.title('StitchES6')
      .end();
  },
  'StichES6 logs properly': (browser) => {
    browser
      .url(browser.launchUrl)
      .waitForElementVisible('#debug', 500)
      .assert.containsText('#debug','nodepool:create')
      .end();
  },
  'Clicking Anywhere unlocks audio': (browser) => {
    browser
      .url(browser.launchUrl)
      .waitForElementVisible('#logo', 500)
      .click('#logo')
      .assert.containsText('#debug', 'node:unlocked')
      .end()
  }
};
