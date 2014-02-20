

module.exports = function(suite, bus) {
  var me = {
    raw: ''
  }
  Object.keys(suite).forEach(function(specName) {
    var spec = suite[specName]
    spec.check(bus)
    var isOK = !bus.log.wasSent('expectation-failure')
    me.raw += specName + ': ' + (isOK ? 'OK' : 'FAIL') + '\n'
  })
  return me
}