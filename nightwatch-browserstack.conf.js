var browserstack = require('browserstack-local');

let nightwatch_config = {
  src_folders: ["tests"],
  custom_assertions_path: 'tests/custom_assertions',
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
    'build': process.env.TRAVIS_BUILD_NUMBER || `local-${process.pid}`,
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
        retryAssertionTimeout: 2000,
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
        'device': 'iPhone 11 Pro',
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
        'device': 'Google Pixel 4',
        'realMobile': 'true',
        'os_version': '10.0'
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