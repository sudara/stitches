var browserstack = require('browserstack-local');

let nightwatch_config = {
  src_folders: ["tests"],

  selenium : {
    "start_process": false,
    "host": "hub-cloud.browserstack.com",
    "port": 80
  },
  common_capabilities: {
    'browserstack.appium_version': "1.16.0",
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
      end_session_on_fail: false,
      skip_testcases_on_fail: false,
      "launch_url": "http://bs-local.com:8080",
      globals: {
        retryAssertionTimeout: 3000,
        // this is so ugly, but the only way we can get failures to report properly
        // to browserstack. We actually are keeping the selenium browser connection open
        // and ending it here in afterEach so we still have access to sessionId and friends
        afterEach: (browser, done) => {
          if (browser.launchUrl.includes("bs-local")) {
            browser.perform(function() {
              // eslint-disable-next-line global-require
              require("./nightwatch-browserstack").updateStatus(browser)
            }).end(function() {
              done();
            })
          }
        },
      }
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
        'os_version': 'Catalina',
        'browser_version': '13.0',
        'browser': 'Safari'      }
    },
    edge: {
      desiredCapabilities: {
        'os': 'Windows',
        'os_version': '10',
        'browser': 'Edge'
      }
    },
    iphoneXS: {
      desiredCapabilities: {
        'device': 'iPhone XS',
        'realMobile': 'true',
        'os_version': '12',
        'nativeWebTap': 'true', // https://appiumpro.com/editions/36
        'browser': 'Safari'
      }
    },
    iphone11: {
      desiredCapabilities: {
        'device': 'iPhone 11',
        'realMobile': 'true',
        'os_version': '13',
        'nativeWebTap': 'true',
        'browser': 'Safari'
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