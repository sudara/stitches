const common_capabilities = {
  'buildName': 'browserstack-build-1',
  'userName': '${BROWSERSTACK_USERNAME}',
  'accessKey': '${BROWSERSTACK_ACCESS_KEY}',
  'debug': true
};
module.exports = {
  test_settings: {
    default: {},
    env1: {
      desiredCapabilities: {
        "browserName": "Chrome",
        "bstack:options" : {
          "browserVersion": "103.0",
          "os": "Windows",
          "osVersion": "11",
          ...common_capabilities
        }
      }
    },
    env2: {
      desiredCapabilities: {
        "browserName": "Firefox",
        "bstack:options" : {
          "browserVersion": "102.0",
          "os": "Windows",
          "osVersion": "10",
          ...common_capabilities
        }
      }
    },
    env3: {
      desiredCapabilities: {
        "browserName": "Safari",
        "bstack:options" : {
          "browserVersion": "14.1",
          "os": "OS X",
          "osVersion": "Big Sur",
          ...common_capabilities
        }
      }
    }
  }
};
