
pipelet.installer = function(bus) {
    bus.on('team-name').then(function init(x) {
      this.send('render', {
        header: x,
        idiot: 1
      })
    })

    bus.on('a').then('c')
    bus.change('c').then(function wafflel() {
      this.send('d', 'i am a little teaot and ')
      this.send('d', 9272)
      this.send('d', { poop: 123, pee: false, poor: true, hai: 'nooo' })
      this.send('x', 1234)
    })
    bus.on('b').then(function david(x) {
      this.send('summering', x+6)
    })
  },

pipelet.specs = [
  spec()
    .describe('Given a')
    .given('team-name', 'Fesk')
    .expect('render', { header: 'Fesk' })
    .inspect()
    ,
  spec()
    .describe('Given a, expect x (specific number)')
    .given('a')
    .expect('x',1234),

  spec()
    .describe('Do some future stuff here, not sure really')
    .given('b')
    .expect('summering', 6)
]
