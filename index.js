var find = require('mout/array/find')
var colors = require('colors');
var prettyjson = require('prettyjson')

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

      var hasExpectations = find(bus.log.all(), function(logEntry) {
        return logEntry.undelivered &&
          (logEntry.undelivered[0][0] === 'expectation-ok' ||
           logEntry.undelivered[0][0] === 'expectation-failure')
      })
      bus.log.all().forEach(function(entry) {
        // Filter out the expectation spec
        //console.log("entry", entry)
        if (entry.injected && entry.injected[0] === 'spec-run') return;
        if (entry.injected && entry.injected[0] === 'spec-check') return;
        if (entry.received && entry.received[0] && entry.received[0][0] === 'spec-run') {
          me.raw += " Injected    ".inverse +  " " + entry.delivered[0][0] + "\n"
          me.raw += "\n"
        } else if (entry.undelivered && entry.undelivered.length > 0 && entry.undelivered[0][0] === 'expectation-ok') {
          me.raw += " Verified    ".inverse.green + " " +  entry.undelivered[0][1] + "\n"
          me.raw += "\n"
        } else if (entry.received && entry.received[0][0] === 'spec-check') {
          if (entry.undelivered && entry.undelivered.length > 0 && entry.undelivered[0][0] === 'expectation-failure')
            me.raw += " Expected    ".inverse.red + " " + entry.undelivered[0][1][0] + '\n'
          return
        }  else if (entry.received) {
          me.raw += " Received    ".inverse + ' ' + entry.received[0][0] + "\n"

          if (entry.delivered) {
            entry.delivered.forEach(function(envelope) {
              me.raw += " Delivered   ".inverse + ' ' + envelope[0]
              var renderedMessage = prettyjson.render(envelope[1], {})
              if (renderedMessage.indexOf('\n') === -1)
                me.raw += ' = ' + renderedMessage + '\n'
              else
                me.raw += "\n" +prettyjson.render(envelope[0][1], {}, "     Sent ".length+1)
            })
          }
          if (entry.undelivered){
            entry.undelivered.forEach(function(envelope) {
              me.raw += " Undelivered ".inverse.yellow + ' ' + envelope[0]
              var renderedMessage = prettyjson.render(envelope[1], {})
              if (renderedMessage.indexOf('\n') === -1)
                me.raw += ' = ' + renderedMessage + '\n'
              else
                me.raw += "\n" +prettyjson.render(envelope[1], {}, "     Sent ".length+1)

              if(!hasExpectations) {
                me.raw += "\n"
                me.raw += "              Is the above message your expected output?\n"
                me.raw += "              If so, you can expect it in your spec:\n"
                me.raw += "\n"
                me.raw += ("              .expect('" + envelope[0] + "', "+JSON.stringify(envelope[1],null,2)+")").bold
                me.raw += "\n"
              }
            })
          }


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