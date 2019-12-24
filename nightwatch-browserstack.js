const request = require('request')

// modified from archived git repo example
// https://github.com/blueimp/nightwatch-browserstack/blob/master/index.js
module.exports = {

  // This test harness is very fragile and obviously these
  // pieces aren't really crafted to work well together.
  // One obvious example of this is the following piece of code,
  // needed because there's no way for selenium/browserstack
  // to actually identify a failed test. Instead, we have to
  // issue an API request from a nightwatch callback to mark the test as failed
  // which will in turn mark it as failed on browserstack and eventually travis.
  // Note that here we are just defining the function.
  // We still need to call it from an afterEach hook in each "suite" (js file)
  updateStatus (browser) {
    const cliOptions = process.argv.slice(2);
    const envIndex = cliOptions.indexOf('--env');
    const envName = cliOptions[envIndex + 1];
    if (browser.currentTest.results.failed > 0) {
      request({
        method: 'PUT',
        uri: `https://api.browserstack.com/automate/sessions/${browser.sessionId}.json`,
        auth: {
          user: process.env.BROWSERSTACK_USERNAME,
          pass: process.env.BROWSERSTACK_ACCESS_KEY,
        },
        form: {
          status: 'error',
          reason: 'failed',
          name: `${envName} env: ${browser.currentTest.module}`,
        },
      })
    } else {
      request({
        method: 'PUT',
        uri: `https://api.browserstack.com/automate/sessions/${browser.sessionId}.json`,
        auth: {
          user: process.env.BROWSERSTACK_USERNAME,
          pass: process.env.BROWSERSTACK_ACCESS_KEY,
        },
        form: {
          name: `${envName} env: ${browser.currentTest.module}`,
          status: 'passed'
        },
      })
    }
  }
}
