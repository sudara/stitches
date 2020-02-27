module.exports.command = function(callback) {

  this.execute(function cleanDebug() {
    document.getElementById("debug").innerHTML = ""
  })

  return this;
}