const progressBarMoved = function(element, percentMoved=10) {
  this.message = `Testing if progress bar moved at least ${percentMoved}%`

  this.expected = () => {
    return `percentMoved`; // what the assertion is tested against
  }

  this.pass = (value) => {
   return (value * 100.0) > percentMoved
  }

  this.value = (result) => {
    return parseFloat(result.value || result); // passed to this.pass
  };

  this.command = (callback) => {
    this.api.getTagName(element, (tagName) => {
      if (tagName.value === "progress") {
        return this.api.getAttribute(element, 'value', callback)
      }
      // this is cheating, but we know our test width...
      return this.api.getElementSize(element, (result) => callback(result.value.width / 250))
    })
  };
};

module.exports.assertion = progressBarMoved;
