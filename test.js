require('chai').should()

var spec = require('spec-thing')
var createBus = require('bus-thing')
var runThing = require('./')
var run = runThing.run
var focus = runThing.focus

var colors     = require('colors')
var prettyjson = require('prettyjson')

// TODO: Error if multiple spec
// TODO: constructor
// TODO: error if no bus or no spec
// TODO: Pretty pending erros
// TODO: Narrower tests
// TODO: Rename run-spec to spec-injects?
//
// Hmmm, perhaps sent + received should be collapsed?

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

  var raw = run(suite, bus).raw
  var expected =
    " Injected ".inverse + " c\n" +
    '\n' +
    " Received ".inverse + " c\n" +
    "     Sent ".inverse + " d = " + prettyjson.render(true) + "\n" +
    '\n' +
    " Verified ".inverse.green + " d\n" +
    '\n'

  raw.should.equal(expected)
})

it('focusing on single, failing spec', function() {
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
  bus.on('c').then('X')

  var expected =
    " Injected ".inverse + " c\n" +
    '\n' +
    " Received ".inverse + " c\n" +
    "     Sent ".inverse + " X = " + prettyjson.render(true) +  "\n" +
    '\n' +
    " Expected ".inverse.red + " d\n"
  run(suite, bus).raw.should.equal(expected)
})

it('renders messages prettified (sent)', function() {
  var bus = createBus()
  bus.on('start').then('hello', {
    propNumber: 123,
    propString: 'hello'
  })
  var suite = {
    'should say hello': focus(spec())
      .given('start')
  }

  run(suite, bus).raw.should.contain(
    "     Sent ".inverse + ' hello\n' +
    prettyjson.render({
      propNumber: 123,
      propString: 'hello'
    }, {}, 11)

    )
})

it('renders se')

