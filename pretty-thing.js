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
      if (entry.worker.name === 'given')
        entry.received = []

      entry.received = entry.received
        .filter(function(delivery) {
          if (entry.worker.name === 'expectationMet' ||
              entry.worker.name === 'expectationNotMet') return false
          return true
        }).map(function(delivery) {
          delivery.statusText = 'on'
          return delivery;
        })
      entry.sent = entry.sent.map(function(delivery) {

        var message = delivery.envelope.message
        if (isBoolean(message))
          delivery.messageBoolean = '' + message
        else if(isNumber(message))
          delivery.messageNumber = '' + message.toString()
        else if(isString(message))
          delivery.messageString = message
        else
          delivery.messageJSON = JSON.stringify(message)

        if (delivery.logOnly) {
          delivery.statusText = 'Logged'
          delivery.statusLook = 'normal'
          return delivery
        }

        delivery.statusText =
          delivery.couldDeliver ? 'Delivered' : 'Undeliverable'
        delivery.statusLook = delivery.couldDeliver ?
          'normal' : 'shaky'

        return delivery
      })

      entry.worker.nameFormatted =
        entry.worker.name === null
        ? 'Anonymous'
        : capitalize(space(entry.worker.name))
      return entry
    })




}

module.exports = pretty