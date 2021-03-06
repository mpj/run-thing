require('chai').should()
var expect = require('chai').expect
var spec = require('spec-thing').spec
var checkModule = require('spec-thing').checkModule
var createBus = require('bus-thing')
var pretty = require('./')
var find = require('mout/array/find')

// pretty-thing takes the log from a bus
// after spec-thing has done a .check()
// and yields a view model ready for rendering
// in an interface


// TODO: Clean things up a bit

// TODO: Capability to render a suite of named specs

// TODO: Clean up tests and duplication

// IDEA: Headers too long and big, making small messages
// have more whitespace than they need.
//
// IDEA: Another way is to change the labeling
// of stuff to something more intuitive, such as wasSent, newSend
// wasChanged, WasChangedOnce, wasTruthy?
//
// IDEA: Hide "Logged" status in Expectation worker logs?


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

  it('should filter out spec-start of the given', function() {
    vm[0].deliveries[0].envelope.address.should.not.equal('spec-start')
  })

  it('should translate couldDeliver (true) to statusText', function() {
    vm[0].deliveries[0].statusText.should.equal('Delivered')
  })

  it('should display delivered deliveries as different statusLook', function() {
    vm[0].deliveries[0].sent.should.be.true
    vm[0].deliveries[0].statusLook.should.equal('different')
  })

  it('should translate null worker to anon', function() {
    vm[1].worker.nameFormatted.should.equal('Anonymous')
  })

  it('should normalized trigger (on) to statusText', function() {
    vm[1].deliveries[0].statusText.should.equal('on')
  })

  it('should show received deliveries as normal statusLook', function() {
    vm[1].deliveries[0].statusLook.should.equal('normal')
  })

  it('should show expectationMet worker output as good', function() {
    vm[2].entryLook.should.equal('good')
  })

  it('should translate camelcase to space case', function() {
    vm[2].worker.nameFormatted.should.equal('Expectation met')
  })

  it('should display successful expectation deliveries as normal', function() {
    vm[2].deliveries[0].statusLook.should.equal('normal')
  })

  it('should display successful expectation deliveries as "Logged"', function() {
    vm[2].deliveries[0].statusText.should.equal('Logged')
  })

  it('should hide expectationNotMet if it sends nothing', function() {
    expect(vm[3]).to.not.exist
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

describe('given that we have a change trigger', function() {
  var vm;
  beforeEach(function() {
    vm = pretty(
      createBus()
        .change('a')
        .then(function() {
          this.log('b')
        })
        .inject('a')
        .log.all()
    )
  })

  it('should write it as the statusText', function() {
    vm[0].deliveries[0].statusText.should.equal('change')
  })
})

it('should translate couldDeliver (false) to statusText', function() {
  var vm = pretty(createBus().on('a').then('b').inject('a').log.all())
  vm[0].deliveries[1].statusText.should.equal('Undeliverable')
  vm[0].deliveries[1].statusLook.should.equal('shaky')
})

it('should display failing expectations as bad', function() {
  var bus = createBus()
  spec().given('a').expect('b').check(bus)

  var vm = pretty(bus.log.all())

  // it - Should filter out triggering expectation
  // TODO: Piggybacking, should be expectation
  vm[1].deliveries[0].envelope.address.should.not.equal('spec-check')

  vm[1].worker.nameFormatted.should.equal('Expectation not met')
  vm[1].entryLook.should.equal('bad')
  vm[1].deliveries[0].statusText.should.equal('Logged')
  vm[1].deliveries[0].statusLook.should.equal('normal')

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

      entryGivenSent  = vm[0].deliveries[0]
      entryWorker     = vm[1]
      entryWorkerSent = vm[1].deliveries[1]
      entryExpectSent = vm[2].deliveries[0]
    }
  })

  describe('if that value is a boolean', function() {
    beforeEach(function() {
      givenValue = false
      sendsValue = true
      exec()
    })

    it('formats the given worker entry message', function() {
      entryGivenSent.messageLook.should.equal('boolean')
    })

    it('formats the main worker entry message', function() {
      entryWorkerSent.messageLook.should.equal('boolean')
    })

    it('formats the expectation worker entry message', function() {
      entryExpectSent.messageLook.should.equal('boolean')
    })

    it('formats the main worker entry received messages too', function() {
      entryWorker.deliveries[0].messageLook.should.equal('boolean')
    })

  })

  describe('if that value is a boolean', function() {
    beforeEach(function() {
      givenValue = 1234
      sendsValue = 5678
      exec()
    })

    it('formats the given worker entry message', function() {
      entryGivenSent.messageLook.should.equal('number')
    })

    it('formats the main worker entry message', function() {
      entryWorkerSent.messageLook.should.equal('number')
    })

    it('formats the expectation worker entry message', function() {
      entryExpectSent.messageLook.should.equal('number')
    })

  })

  describe('if that value is a string', function() {
    beforeEach(function() {
      givenValue = 'haibox'
      sendsValue = 'yay'
      exec()
    })

    it('formats the given worker entry message', function() {
      entryGivenSent.messageLook.should.equal('string')
    })

    it('formats the main worker entry message', function() {
      entryWorkerSent.messageLook.should.equal('string')
    })

    it('formats the expectation worker entry message', function() {
      entryExpectSent.messageLook.should.equal('string')
    })

    it('welds on double quotes (sent)', function() {
      entryWorkerSent.envelope.message.should.equal('"yay"')
    })
    it('welds on double quotes (sent)', function() {
      entryWorker.deliveries[0].envelope.message.should.equal('"haibox"')
    })

  })

  describe('if that value is an object', function() {
    beforeEach(function() {
      givenValue = { a: [ 1, 'b' ]}
      sendsValue = { c: { d: 4 }}
      exec()
    })

    it('formats the given worker entry message', function() {
      entryGivenSent.messageLook.should.equal('object')
      entryGivenSent.envelope.message.should.equal(JSON.stringify(givenValue))
    })

    it('formats the main worker entry message', function() {
      entryWorkerSent.messageLook.should.equal('object')
      entryWorkerSent.envelope.message.should.equal(JSON.stringify(sendsValue))
    })

    it('formats the expectation worker entry message', function() {
      entryExpectSent.messageLook.should.equal('object')
      entryExpectSent.envelope.message.should.equal(JSON.stringify(sendsValue))
    })

  })

})

describe('it we prettify the results of an inspected module spec', function() {
  var vm;
  beforeEach(function(done) {
    checkModule({
      installer: function(bus) {
        bus.on('hello').then('world')
      },
      specs: [
        spec()
          .inspect()
          .describe('given hello, expect world')
          .given('hello')
          .expect('world')
      ]
    }).then(function(bus) {
      vm = pretty(bus.log.all())
    }).done(done)
  })

  it('filters out inspecteeResolver entries', function() {
    expect(find(vm, function(entry) {
      return entry.worker.name === 'inspecteeResolver'
    })).to.not.exist
  })

  it('filters out spec-description', function() {
    expect(find(vm, function(entry) {
      return entry.deliveries[0].envelope.address
        === 'spec-description'
    })).to.not.exist
  })

  it('show description as property', function() {
    vm.description.should.equal('given hello, expect world')
  })
})


function dbg(vm) {
  console.log('')
  console.log('--- DEBUG ---')
  console.log(JSON.stringify(vm, null, 2))
}


