require('chai').should()

var spec = require('spec-thing')
var createBus = require('bus-thing')
var pretty = require('./pretty-thing')

// pretty-thing takes the log from a bus
// after spec-thing has done a .check()
// and yields a view model ready for rendering
// in an interface
//


// TODO: Clean up tests and duplication

// TODO: Hide expectationNotMet if it sends nothing.
// Perhaps this is something that the worker itself could
// be allowed to do? this.stealth()
//
// TODO: Remove duplication in template
// TODO: Test for change statustext normalization
//
// IDEA: Headers too long and big, making small messages
// have more whitespace than they need.
// IDEA: Make deliveries more visually distinct (color?)
// to allow for flowing layout merging sent and received.
// Just having sent and logged items have a slightly different
// color might actually do it. Another way is to change the labeling
// of stuff to something more intuitive, such as wasSent, newSend
// wasChanged, WasChangedOnce, wasTruthy?
// IDEA: Hide "Logged" status in Expectation worker logs?

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

  it('should filter out the message triggering expecations not met', function() {
    vm[2].received.length.should.equal(0)
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

  // Should filter out triggering expectation
  // TODO: Piggybacking, should be expectation
  vm[1].received.length.should.equal(0)
})


describe('given that we have a worker that sends and expects a given value', function() {
  var exec;
  var givenValue;
  var sendsValue;

  var entryGivenSent;

  var entryWorker;
  var entryWorkerSent;
  var entryExpectSent;


  beforeEach(function() {
    var bus = createBus()
    exec = function() {
      bus
        .on('a', givenValue)
        .then('b', sendsValue)
      spec()
        .given('a', givenValue)
        .expect('b', sendsValue)
        .check(bus)
      var vm = pretty(bus.log.all())

      entryGivenSent  = vm[0].sent[0]
      entryWorker     = vm[1]
      entryWorkerSent = vm[1].sent[0]
      entryExpectSent = vm[2].sent[0]
    }
  })

  describe('if that value is a boolean', function() {
    beforeEach(function() {
      givenValue = false
      sendsValue = true
      exec()
    })

    it('formats the given worker entry message', function() {
      entryGivenSent.messageClass.should.equal('boolean')
    })

    it('formats the main worker entry message', function() {
      entryWorkerSent.messageClass.should.equal('boolean')
    })


    it('formats the expectation worker entry message', function() {
      entryExpectSent.messageClass.should.equal('boolean')
    })

    it('formats the main worker entry received messages too', function() {
      entryWorker.received[0].messageClass.should.equal('boolean')
    })

  })

  describe('if that value is a boolean', function() {
    beforeEach(function() {
      givenValue = 1234
      sendsValue = 5678
      exec()
    })

    it('formats the given worker entry message', function() {
      entryGivenSent.messageClass.should.equal('number')
    })

    it('formats the main worker entry message', function() {
      entryWorkerSent.messageClass.should.equal('number')
    })

    it('formats the expectation worker entry message', function() {
      entryExpectSent.messageClass.should.equal('number')
    })

  })

  describe('if that value is a string', function() {
    beforeEach(function() {
      givenValue = 'haibox'
      sendsValue = 'yay'
      exec()
    })

    it('formats the given worker entry message', function() {
      entryGivenSent.messageClass.should.equal('string')
    })

    it('formats the main worker entry message', function() {
      entryWorkerSent.messageClass.should.equal('string')
    })

    it('formats the expectation worker entry message', function() {
      entryExpectSent.messageClass.should.equal('string')
    })

    it('welds on double quotes (sent)', function() {
      entryWorkerSent.envelope.message.should.equal('"yay"')
    })
    it('welds on double quotes (sent)', function() {
      entryWorker.received[0].envelope.message.should.equal('"haibox"')
    })

  })

  describe('if that value is an object', function() {
    beforeEach(function() {
      givenValue = { a: [ 1, 'b' ]}
      sendsValue = { c: { d: 4 }}
      exec()
    })

    it('formats the given worker entry message', function() {
      entryGivenSent.messageClass.should.equal('object')
      entryGivenSent.envelope.message.should.equal(JSON.stringify(givenValue))
    })

    it('formats the main worker entry message', function() {
      entryWorkerSent.messageClass.should.equal('object')
      entryWorkerSent.envelope.message.should.equal(JSON.stringify(sendsValue))
    })

    it('formats the expectation worker entry message', function() {
      entryExpectSent.messageClass.should.equal('object')
      entryExpectSent.envelope.message.should.equal(JSON.stringify(sendsValue))
    })

  })


})


function dbg(vm) {
  console.log('')
  console.log('--- DEBUG ---')
  console.log(JSON.stringify(vm, null, 2))
}


