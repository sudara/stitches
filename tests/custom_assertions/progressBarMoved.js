const progressBarMoved = function(definition, percentMoved=5) {
  this.message = `Testing if progress bar moved at least ${percentMoved}%`

  this.expected = () => {
    return true; // what the assertion is tested against
  }

  this.pass = (value) => {
   return value > (parseFloat(percentMoved)/100)
  }

  this.value = (result) => {
    return parseFloat(result.value); // passed to this.pass
  };

  this.command = (callback) => {
    return this.api.getValue(definition, callback); // passed to this.value
  };
};

module.exports.assertion = progressBarMoved;