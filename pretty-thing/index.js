var capitalize = require('capitalize')
var space = require('to-space-case')
var isBoolean = require('mout/lang/isBoolean')
var isNumber = require('mout/lang/isNumber')
var isString = require('mout/lang/isString')
var find = require('mout/array/find')

var pretty = function(logEntries) {
  var description;
  var entries = logEntries
    .filter(function(entry) {
      if (entry.worker.name === 'injector')
        return false;
      if (entry.worker.name === 'expectationNotMet') {
        if (!find(entry.deliveries, { sent: true }))
          return false;
      }

      if (entry.worker.name === 'inspecteeResolver')
        return false;

      var descriptionDelivery = find(entry.deliveries, function(delivery) {
        return delivery.sent &&
               delivery.envelope.address === 'spec-description'
      })


      if (descriptionDelivery) {
        description = descriptionDelivery.envelope.message;
        return false
      }

      return true
    })
    .map(function(entry) {

      if (entry.worker.name === 'expectationNotMet')
        entry.entryLook = 'bad'
      if (entry.worker.name === 'expectationMet')
        entry.entryLook = 'good'

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
            delivery.statusLook = 'normal'
          } else if(!!delivery.sent) {
            delivery.statusText =
              delivery.couldDeliver ? 'Delivered' : 'Undeliverable'
            delivery.statusLook = delivery.couldDeliver ?
              'different' : 'shaky'
          } else {
            delivery.statusText = delivery.trigger
            delivery.statusLook = 'normal'
          }

          var message = delivery.envelope.message
          if (isBoolean(message)) {
            delivery.messageLook = 'boolean'
          } else if(isNumber(message)) {
            delivery.messageLook = 'number'
          } else if(isString(message)) {
            delivery.messageLook = 'string'
            delivery.envelope.message = '"' + message + '"'
          } else {

            delivery.messageLook = 'object'
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
  entries.description = description;
  return entries




}

module.exports = pretty