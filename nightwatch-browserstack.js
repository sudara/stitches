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
    const status = browser.currentTest.results.failed > 0 ? 'failed' : 'passed'

    // See https://www.browserstack.com/automate/rest-api
    request({
      method: 'PUT',
      uri: `https://api.browserstack.com/automate/sessions/${browser.sessionId}.json`,
      auth: {
        user: process.env.BROWSERSTACK_USERNAME,
        pass: process.env.BROWSERSTACK_ACCESS_KEY,
      },
      form: {
        status,
      },
    })
    // apparently we need to send the name of the test seperately from the status
    // since updating tests as passing doesn't actually work
    request({
      method: 'PUT',
      uri: `https://api.browserstack.com/automate/sessions/${browser.sessionId}.json`,
      auth: {
        user: process.env.BROWSERSTACK_USERNAME,
        pass: process.env.BROWSERSTACK_ACCESS_KEY,
      },
      form: {
        name: `${browser.currentTest.name}`,
      },
    })
  }
}
