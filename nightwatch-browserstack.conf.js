var browserstack = require('browserstack-local');

let nightwatch_config = {
  src_folders: ["tests"],

  selenium : {
    "start_process": false,
    "host": "hub-cloud.browserstack.com",
    "port": 80
  },
  common_capabilities: {
    'browserstack.user': 'sudarawilliams1' || 'BROWSERSTACK_USERNAME',
    'browserstack.key': process.env.BROWSERSTACK_ACCESS_KEY || 'BROWSERSTACK_ACCESS_KEY',
    'browserstack.debug': true,
    'browserstack.local': true
  },

  test_settings: {
    default: {
      "launch_url": "http://bs-local.com:8080"
    },
    chrome: {
      desiredCapabilities: {
        'os': 'Windows',
        'os_version': '10',
        'browser': 'Chrome',
        'browser_version': '71.0'
      }
    },
    firefox: {
      desiredCapabilities: {
        'os_version': 'High Sierra',
        'browser': 'Firefox',
        'browser_version': '64.0'
      }
    },
    safari: {
      desiredCapabilities: {
        'os_version': 'Mojave',
        'browser': 'Safari',
        'browser_version': '12.0',
      }
    },
    edge: {
      desiredCapabilities: {
        'os': 'Windows',
        'os_version': '10',
        'browser': 'Edge',
        'resolution': '1024x768'
      }
    },
    iphone: {
      desiredCapabilities: {
        'device': 'iPhone 8 Plus',
        'realMobile': 'true',
        'os_version': '11.0'
      }
    },
    galaxy: {
      desiredCapabilities: {
        'device': 'Samsung Galaxy S9',
        'realMobile': 'true',
        'os_version': '8.0'
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