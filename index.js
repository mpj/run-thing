var find = require('mout/array/find')
var colors = require('colors');

module.exports = {
  run: function(suite, bus) {
    var me = {
      raw: ''
    }
    var focusSpec = null
    var focusSpecName = null
    Object.keys(suite).forEach(function(specName) {
      var spec = suite[specName]
      if (spec.__runnerFocus) {
        focusSpec     = spec
        focusSpecName = specName
      }
    })
    if (focusSpec) {
      focusSpec.check(bus)
      bus.log.all().forEach(function(entry) {
        // Filter out the expectation spec
        //console.log("entry", entry)
        if (entry.injected && entry.injected[0] === 'spec-run') return;
        if (entry.injected && entry.injected[0] === 'spec-check') return;
        if (entry.received && entry.received[0] && entry.received[0][0] === 'spec-run') {
          me.raw += " Injected ".inverse +  " " + entry.sent[0][0] + "\n"
          me.raw += "\n"
        } else if (entry.sent && entry.sent.length > 0 && entry.sent[0][0] === 'expectation-ok') {
          me.raw += " Verified ".inverse.green + " " +  entry.sent[0][1] + "\n"
          me.raw += "\n"
        } else if (entry.received && entry.received[0][0] === 'spec-check') {
          if (entry.sent && entry.sent.length > 0 && entry.sent[0][0] === 'expectation-failure')
            me.raw += " Expected ".inverse.red + " " + entry.sent[0][1][0] + '\n'
          return
        } else if (entry.received) {
          me.raw += " Received ".inverse + ' ' + entry.received[0][0] + "\n"
          me.raw += "     Sent ".inverse + ' ' + entry.sent[0][0] + "\n"
          me.raw += "\n"
        }
      })
    } else {
      Object.keys(suite).forEach(function(specName) {
        var spec = suite[specName]
        spec.check(bus)
        var isOK = !bus.log.wasSent('expectation-failure')
        me.raw += specName + ': ' + (isOK ? 'OK' : 'FAIL') + '\n'
      })
    }

    return me
  },
  focus: function(spec) {
    spec.__runnerFocus = true
    return spec
  }
}