require('chai').should()

var spec = require('spec-thing')
var createBus = require('bus-thing')
var pretty = require('./pretty-thing')

// pretty-thing takes the log from a bus
// after spec-thing has done a .check()
// and yields a view model ready for rendering
// in an interface
//
// TODO: Not delivered
// TODO: Test for change statustext normalization


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
    console.log(JSON.stringify(vm,null,2))
    vm[0].sender.name.should.not.equal('injector')
  })

  it('should have given as first entry', function() {
    vm[0].sender.nameFormatted.should.equal('Given')
  })

  it('should remove the received messages from the given', function() {
    vm[0].received.should.deep.equal([])
  })

  it('should translate couldDeliver (true) to statusText', function() {
    vm[0].sent[0].statusText.should.equal('Delivered')
  })

  it('should translate null sender to anon', function() {
    vm[1].sender.nameFormatted.should.equal('Anonymous')
  })

  it('should normalized trigger (on) to statusText', function() {
    vm[1].received[0].statusText.should.equal('on')
  })

  it('should translate camelcase to space case', function() {
    vm[2].sender.nameFormatted.should.equal('Expectation success')
  })

})

it('should translate couldDeliver (false) to statusText', function() {
  var vm = pretty(createBus().on('a').then('b').inject('a').log.all())
  vm[0].sent[0].statusText.should.equal('Undeliverable')
})



