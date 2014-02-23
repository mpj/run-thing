var capitalize = require('capitalize')
var space = require('to-space-case')

var pretty = function(logEntries) {
  return logEntries
    .filter(function(entry) {
      if (entry.sender.name === 'injector')
        return false
      return true
    })
    .map(function(entry) {
      if (entry.sender.name === 'given')
        entry.received = []

      entry.received = entry.received.map(function(delivery) {
        delivery.statusText = 'on'
        return delivery;
      })
      entry.sent = entry.sent.map(function(delivery) {
        delivery.statusText =
          delivery.couldDeliver ? 'Delivered' : 'Undeliverable'
        return delivery
      })

      entry.sender.nameFormatted =
        entry.sender.name === null
        ? 'Anonymous'
        : capitalize(space(entry.sender.name))
      return entry
    })




}

module.exports = pretty