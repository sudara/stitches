var browserstack = require('browserstack-local');

let nightwatch_config = {
  src_folders: ["tests"],

  selenium : {
    "start_process": false,
    "host": "hub-cloud.browserstack.com",
    "port": 80
  },
  common_capabilities: {
    'browserstack.user': process.env.BROWSERSTACK_USERNAME,
    'browserstack.key': process.env.BROWSERSTACK_ACCESS_KEY,
    'browserstack.localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
    'build': process.env.TRAVIS_BUILD_NUMBER || 'local',
    'browserstack.debug': true,
    'browserstack.local': true,
    'browserstack.console': 'info'
  },

  test_settings: {
    default: {
      "launch_url": "http://bs-local.com:8080",

      // This test harness is very fragile and obviously these
      // pieces aren't really crafted to work well together.
      // One obvious example of this is the following piece of code,
      // needed because there's no way for selenium/browserstack
      // to actually identify a failed test. Instead, we have to
      // issue an API request from a nightwatch callback to mark the test as failed
      // which will in turn mark it as failed on browserstack and eventually travis.
      "globals": {
        afterEach: function (client, done) {
          console.log('afterEach called...')
          if (client.currentTest.results.failed > 0) {
            request({
              method: 'PUT',
              uri: `https://api.browserstack.com/automate/sessions/${client.sessionId}.json`,
              auth: {
                user: process.env.BROWSERSTACK_USERNAME,
                pass: process.env.BROWSERSTACK_ACCESS_KEY,
              },
              form: {
                status: 'error',
                reason: 'failed'
              },
            })
          }
          done()
        }
      },
    },
    chrome: {
      desiredCapabilities: {
        'os': 'Windows',
        'os_version': '10',
        'browser': 'Chrome',
      }
    },
    chromeMac: {
      desiredCapabilities: {
        'os': 'OS X',
        'os_version': 'Mojave',
        'browser': 'Chrome',
      }
    },
    firefox: {
      desiredCapabilities: {
        'os': 'Windows',
        'os_version': '10',
        'browser': 'Firefox'
      }
    },
    safari: {
      desiredCapabilities: {
        'os': 'OS X',
        'os_version': 'Mojave',
        'browser': 'Safari'
      }
    },
    edge: {
      desiredCapabilities: {
        'os': 'Windows',
        'os_version': '10',
        'browser': 'Edge'
      }
    },
    iphone: {
      desiredCapabilities: {
        'device': 'iPhone 8',
        'realMobile': 'true',
        'os_version': '12.1',
        'nativeWebTap': 'true'
      }
    },
    galaxys9: {
      desiredCapabilities: {
        'device': 'Samsung Galaxy S9',
        'realMobile': 'true',
        'os_version': '8.0'
      }
    },
    ucbrowser: {
      desiredCapabilities: {
        'device': 'Samsung Galaxy S9',
        'realMobile': 'true',
        'os_version': '8.0',
        'browser': 'ucbrowser'
      }
    },
    pixel: {
      desiredCapabilities: {
        'device': 'Google Pixel 3',
        'realMobile': 'true',
        'os_version': '9.0'
      }
    }
  }
};

// Code to support common capabilites
for (var i in nightwatch_config.test_settings) {
  var config = nightwatch_config.test_settings[i];
  config['selenium_host'] = nightwatch_config.selenium.host;
  config['selenium_port'] = nightwatch_config.selenium.port;
  config['desiredCapabilities'] = config['desiredCapabilities'] || {};
  for (var j in nightwatch_config.common_capabilities) {
    config['desiredCapabilities'][j] = config['desiredCapabilities'][j] || nightwatch_config.common_capabilities[j];
  }
}

module.exports = nightwatch_config;