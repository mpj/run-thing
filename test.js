require('chai').should()

var spec = require('spec-thing')
var createBus = require('bus-thing')
var runThing = require('./')
var run = runThing.run
var focus = runThing.focus

// TODO: Error if multiple spec
// TODO: constructor
// TODO: error if no bus or no spec

it('runs a suite with a single, implemented, spec', function() {
  var bus = createBus()
  var suite = {
    'expect b if a': spec()
      .given('a')
      .expect('b')
  }
  bus.on('a').then('b')
  run(suite, bus).raw.should.equal('expect b if a: OK\n')
})

it('runs a spec suite', function() {
  var bus = createBus()
  var suite = {
    'expect b if a': spec()
      .given('a')
      .expect('b'),

    'expect d if c': spec()
      .given('c')
      .expect('d')
  }

  bus.on('a').then('b')
  bus.on('c').then('X')

  run(suite, bus).raw.should.equal(
    'expect b if a: OK\n' +
    'expect d if c: FAIL\n')
})

it('focusing on single, OK spec', function() {
  var bus = createBus()
  var suite = {
    'expect b if a': spec()
      .given('a')
      .expect('b'),

    'expect d if c': focus(spec())
      .given('c')
      .expect('d')
  }

  bus.on('a').then('b')
  bus.on('c').then('d')

  run(suite, bus).raw.should.equal(
    "Injected: 'c'\n" +
    "Received: 'c'\n" +
    "Fulfilled: 'd'\n"
    )
})