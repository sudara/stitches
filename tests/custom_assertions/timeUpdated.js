const timeUpdated = function (element, toString) {
  this.message = `Testing if time went past ${toString}`

  this.expected = () => {
    return toString; // what the assertion is tested against
  }

  this.pass = (value) => {
    // value is in clock format like: 0:01
    // We want to make sure it's at least passed 0:01
    // Some browsers are a bit choppy, so we want to be flexible
    // and just confirm the time went past the
    return parseInt(value.substr(-2), 10) >= parseInt(toString.substr(-2), 10)
  }

  this.value = (result) => {
    return result.value;
  };

  this.command = (callback) => {
    return this.api.getText(element, callback);
  };
};

module.exports.assertion = timeUpdated;