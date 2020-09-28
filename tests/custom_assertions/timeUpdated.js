const timeUpdated = function (element, toString) {
  this.message = `Testing if time was updated to ${toString}`

  this.expected = () => {
    return toString; // what the assertion is tested against
  }

  this.pass = (value) => {
    return value === toString;
  }

  this.value = (result) => {
    return result.value;
  };

  this.command = (callback) => {
    return this.api.getText(element, callback);
  };
};

module.exports.assertion = timeUpdated;