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
      "selenium_host": "ondemand.eu-central-1.saucelabs.com",
      "selenium_port": 80,
      "use_ssl": false,
      "skip_testcases_on_fail": false,
      "tunnelIdentifier": 'stitches',
      "build": process.env.CIRCLE_BUILD_NUM,
      "username": process.env.SAUCELABS_USER,
      "access_key": process.env.SAUCELABS_KEY,
      "output": true
    },
    chrome: {
      desiredCapabilities: {
        'platform': 'Windows 10',
        'browserName': 'Chrome',
        'version': 'latest',
        "tunnelIdentifier": 'stitches',
      }
    },
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