var browserstack = require('browserstack-local');

let nightwatch_config = {
  src_folders: ["tests/suites"],
  custom_assertions_path: 'tests/custom_assertions',
  custom_commands_path: 'tests/custom_commands',
  end_session_on_fail: false, // we are ending sessions in afterEach
  skip_testcases_on_fail: false,
  globals: {
    // default is 500 which means playback is only checked 2x sec
    // we would like to regularly check on playback progress, a bit more frequently
    waitForConditionPollInterval: 125,
  },
  selenium : {
    "start_process": false,
    "host": "hub-cloud.browserstack.com",
    "port": 443
  },
  common_capabilities: {
    'browserstack.appium_version': "1.18.0",
    "browserstack.selenium_version": "3.141.59",
    'browserstack.user': process.env.BROWSERSTACK_USERNAME,
    'browserstack.key': process.env.BROWSERSTACK_ACCESS_KEY,
    'browserstack.localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
    'project': 'stitches',
    'build': process.env.TRAVIS_BUILD_NUMBER || `local-${process.pid}`,
    'browserstack.debug': true,
    'browserstack.local': true,
    'browserstack.console': 'info',
    'resolution': '1920x1080'
  },
  test_settings: {
    default: {
      "launch_url": "http://bs-local.com:8080",
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
        'os_version': 'Catalina',
        'browser': 'Chrome',
      }
    },
    firefox: {
      desiredCapabilities: {
        'os': 'Windows',
        'browser': 'Firefox'
      }
    },
    firefoxMac: {
      desiredCapabilities: {
        'os': 'OS X',
        'browser': 'Firefox'
      }
    },
    safari12: {
      desiredCapabilities: {
        "os": "OS X",
        "os_version": "Mojave",
        "browserName": "Safari",
        "browser_version": "12.0",
      }
    },
    // Safari 13 webdriver is currently broken in a major way
    // It cannot click accurately
    // https://bugs.webkit.org/show_bug.cgi?id=202589
    safari13: {
      desiredCapabilities: {
        'os': 'OS X',
        'os_version': 'Catalina',
        'browser': 'Safari'
      }
    },
    edge: {
      desiredCapabilities: {
        'os': 'Windows',
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
    ios13: {
      desiredCapabilities: {
        'device': 'iPhone 11 Pro',
        'realMobile': 'true',
        'os_version': '13',
        'nativeWebTap': 'true',
        'browser': 'Safari'
      }
    },
    ios14: {
      desiredCapabilities: {
        'device': 'iPhone 11',
        'realMobile': 'true',
        'os_version': '14',
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