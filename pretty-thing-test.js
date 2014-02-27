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
// TODO: string* should probably be on the envelope
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

  it('should render the message as JSON', function() {
    vm[0].sent[0].stringJSON.should.equal(JSON.stringify({
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

  // Should filter out triggering expectation
  // TODO: Piggybacking, should be expectation
  vm[1].received.length.should.equal(0)
})


describe('given that we have a worker that sends and expects a given value', function() {
  var exec;
  var givenValue;
  var sendsValue;

  var entryGivenSent;
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
      entryGivenSent.stringBoolean.should.equal('false')
    })

    it('formats the main worker entry message', function() {
      entryWorkerSent.stringBoolean.should.equal('true')
    })

    it('formats the expectation worker entry message', function() {
      entryExpectSent.stringBoolean.should.equal('true')
    })

  })

  describe('if that value is a boolean', function() {
    beforeEach(function() {
      givenValue = 1234
      sendsValue = 5678
      exec()
    })

    it('formats the given worker entry message', function() {
      entryGivenSent.stringNumber.should.equal('1234')
    })

    it('formats the main worker entry message', function() {
      entryWorkerSent.stringNumber.should.equal('5678')
    })

    it('formats the expectation worker entry message', function() {
      entryExpectSent.stringNumber.should.equal('5678')
    })

  })

  describe('if that value is a string', function() {
    beforeEach(function() {
      givenValue = 'haibox'
      sendsValue = 'yay'
      exec()
    })

    it('formats the given worker entry message', function() {
      entryGivenSent.stringString.should.equal('haibox')
    })

    it('formats the main worker entry message', function() {
      entryWorkerSent.stringString.should.equal('yay')
    })

    it('formats the expectation worker entry message', function() {
      entryExpectSent.stringString.should.equal('yay')
    })

  })

})


function dbg(vm) {
  console.log('')
  console.log('--- DEBUG ---')
  console.log(JSON.stringify(vm, null, 2))
}


