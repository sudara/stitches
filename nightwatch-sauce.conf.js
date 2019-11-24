let nightwatch_config = {
  src_folders: ["tests"],
  custom_commands_path: "./nightwatch_commands",
  selenium : {
    "start_process": false,
  },
  common_capabilities: {
    'javascriptEnabled': true,
    "acceptSslCerts": true,
  },

  test_settings: {
    default: {
      "launch_url": "http://localhost:8080",
      "skip_testcases_on_fail": false,
      "selenium_host": "ondemand.eu-central-1.saucelabs.com",
      "selenium_port": 80,
      "tunnelIdentifier": 'stitches',
      "build": process.env.CIRCLE_BUILD_NUM,
      "username": process.env.SAUCELABS_USER,
      "access_key": process.env.SAUCELABS_KEY,
      "use_ssl": false,
      "output": true
    },
    chrome: {
      desiredCapabilities: {
        'platform': 'Windows 10',
        'browserName': 'Chrome',
        'version': 'latest'
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
  config['desiredCapabilities'] = config['desiredCapabilities'] || {};
  for (var j in nightwatch_config.common_capabilities) {
    config['desiredCapabilities'][j] = config['desiredCapabilities'][j] || nightwatch_config.common_capabilities[j];
  }
}

module.exports = nightwatch_config;