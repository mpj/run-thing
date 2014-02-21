var find = require('mout/array/find')

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
          me.raw += "Injected: '" + entry.sent[0][0] + "'\n"
        } else if (entry.sent && entry.sent.length > 0 && entry.sent[0][0] === 'expectation-ok') {
          me.raw += "Fulfilled: '" + entry.sent[0][1] + "'\n"
        } else if (entry.received && entry.received[0][0] === 'spec-check') {
          // show unexpected later
          return
        } else if (entry.received) {
          me.raw += "Received: '" + entry.received[0][0] + "'\n"
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