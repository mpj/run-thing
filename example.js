var spec = require('spec-thing')
var createBus = require('bus-thing')
var runThing = require('./')
var run = runThing.run
var focus = runThing.focus

var bus = createBus();
bus.on('a').then('b')

var suite = {
  'yeah some spec': focus(spec()).given('a').expect('b', true)
}

console.log(run(suite, bus).raw)


