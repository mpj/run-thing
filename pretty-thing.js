var capitalize = require('capitalize')
var space = require('to-space-case')
var isBoolean = require('mout/lang/isBoolean')
var isNumber = require('mout/lang/isNumber')
var isString = require('mout/lang/isString')

var pretty = function(logEntries) {
  return logEntries
    .filter(function(entry) {
      if (entry.worker.name === 'injector')
        return false
      return true
    })
    .map(function(entry) {
      entry.deliveries = entry.deliveries
        .filter(function(delivery) {

          // Hide stuff triggering exceptions as they are
          // just clutter.
          if (!!delivery.received) {
            if (entry.worker.name         === 'expectationMet'    ||
                entry.worker.name         === 'expectationNotMet' ||
                delivery.envelope.address === 'spec-start') {
              return false
            }
          }

          return true
        }).map(function(delivery) {

          if (delivery.logOnly) {
            delivery.statusText = 'Logged'
            delivery.statusClass = 'normal'
          } else if(!!delivery.sent) {
            delivery.statusText =
              delivery.couldDeliver ? 'Delivered' : 'Undeliverable'
            delivery.statusClass = delivery.couldDeliver ?
              'normal' : 'shaky'
          } else {
            delivery.statusText = 'on'
            // TODO: Test for statusLook
          }

          var message = delivery.envelope.message
          if (isBoolean(message)) {
            delivery.messageClass = 'boolean'
          } else if(isNumber(message)) {
            delivery.messageClass = 'number'
          } else if(isString(message)) {
            delivery.messageClass = 'string'
            delivery.envelope.message = '"' + message + '"'
          } else {

            delivery.messageClass = 'object'
            delivery.envelope.message = JSON.stringify(message)
          }
          return delivery;

        })


      entry.worker.nameFormatted =
        entry.worker.name === null
        ? 'Anonymous'
        : capitalize(space(entry.worker.name))
      return entry
    })




}

module.exports = pretty