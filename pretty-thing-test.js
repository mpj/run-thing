require('chai').should()

var spec = require('spec-thing')
var createBus = require('bus-thing')
var pretty = require('./pretty-thing')

// pretty-thing takes the log from a bus
// after spec-thing has done a .check()
// and yields a view model ready for rendering
// in an interface
//


// TODO: Show primitive messages as different
// TODO: Filter out message triggering Expectation not met
// TODO: Hide received if empty
// TODO: Remove duplication in template
// TODO: Test for change statustext normalization
// IDEA: Make deliveries more visually distinct (color?)
// to allow for flowing layout merging sent and received.

// TODO: Show failing worker as bad
// TODO: Show met worker as good

//


describe('When we render the log from a simple case', function() {
  var vm;
  var entries;
  beforeEach(function() {
    var bus = createBus()
    bus.on('add').then(function(operands) {
      this.send('result', operands[0] + operands[1])
    })
    spec()
      .given('add', [3,4])
      .expect('result', 7)
      .check(bus)
    entries = bus.log.all()
    vm = pretty(entries)
  })

  it('should filter injector', function() {
    vm[0].worker.name.should.not.equal('injector')
  })

  it('should have given as first entry', function() {
    vm[0].worker.nameFormatted.should.equal('Given')
  })

  it('should remove the received messages from the given', function() {
    vm[0].received.should.deep.equal([])
  })

  it('should translate couldDeliver (true) to statusText', function() {
    vm[0].sent[0].statusText.should.equal('Delivered')
  })

  it('should display delivered deliveries as normal status', function() {
    vm[0].sent[0].statusLook.should.equal('normal')
  })

  it('should translate null worker to anon', function() {
    vm[1].worker.nameFormatted.should.equal('Anonymous')
  })

  it('should normalized trigger (on) to statusText', function() {
    vm[1].received[0].statusText.should.equal('on')
  })

  it('should translate camelcase to space case', function() {
    vm[2].worker.nameFormatted.should.equal('Expectation met')
  })

  it('should display successful expectations as normal', function() {
    vm[2].sent[0].statusLook.should.equal('normal')
  })

  it('should display successful expectations as "expected"', function() {
    vm[2].sent[0].statusText.should.equal('Logged')
  })

})

describe('given that we render a log from complex send', function() {
  var vm;
  beforeEach(function() {
    var bus = createBus()
    bus.on('add').then(function(operands) {
      this.send('complex', {
        values: [123, 'poop']
      })
    }).inject('add')
    var entries = bus.log.all()
    vm = pretty(entries)
  })

  it('should render the message as JSON', function() {
    vm[0].sent[0].jsonData.should.equal(JSON.stringify({
      values: [123, 'poop']
    }))
  })
})

it('should translate couldDeliver (false) to statusText', function() {
  var vm = pretty(createBus().on('a').then('b').inject('a').log.all())
  vm[0].sent[0].statusText.should.equal('Undeliverable')
  vm[0].sent[0].statusLook.should.equal('shaky')
})

it('should display failing expectations as bad', function() {
  var bus = createBus()
  spec().given('a').expect('b').check(bus)

  var vm = pretty(bus.log.all())

  vm[1].worker.nameFormatted.should.equal('Expectation not met')
  vm[1].sent[0].statusText.should.equal('Logged')
  vm[1].sent[0].statusLook.should.equal('normal')

})



