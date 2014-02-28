(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
createBus = require('bus-thing')
spec = require('spec-thing')
pretty = require('./pretty-thing')
},{"./pretty-thing":37,"bus-thing":2,"spec-thing":34}],2:[function(require,module,exports){
var isArray = require('mout/lang/isArray')
var pluck = require('mout/array/pluck')
var find = require('mout/array/find')
var partial = require('mout/function/partial')
var deepEqual = require('deep-equal')
var isFunction = require('mout/lang/isFunction')
var isUndefined = require('mout/lang/isUndefined')
var isArguments = require('is-arguments')

function envelopeFrom(args) {
  // TODO: Verify message format
  return {
    address: args[0],
    message: isUndefined(args[1]) ? true : args[1]
  }
}

var createBus = function() {
  var me = {}

  var observers      = []
  var lastMessageMap = {}
  var logEntries     = []

  function isWorker(func) {
    return !!find(observers, function(observer) {
      return observer.worker === func
    })
  }

  me.log = {
    all: function() { return logEntries },
    wasSent: function(address, message) {
      return me.log.worker(null).didSend(address, message)
    },
    wasLogged: function(address, message) {
      return me.log.worker(null).didLog(address, message)
    },
    worker: function(didSenderName) {
      function didSendOrLog(type, didAddress, didMessage) {
        return !!find(logEntries, function(entry) {
          if (!!didSenderName && didSenderName !== entry.worker.name)
            return false

          return !!find(entry.sent, function(delivery) {

            if (type === 'log' && !delivery.logOnly)
              return false

            if (type === 'send' && !!delivery.logOnly)
              return false

            if (didAddress !== delivery.envelope.address)
              return false

            if (!!didMessage &&
                 !deepEqual(didMessage, delivery.envelope.message))
              return false
            return true
          })
        })
      }
      var cmd = {
        didSend: partial(didSendOrLog, 'send'),
        didLog:  partial(didSendOrLog, 'log')
      }
      return cmd
    }
  }

  var addTrigger = function(type, triggers, address, message) {
    if (isFunction(message))
      throw new Error(
        'Second argument to "' + type + '" was a function. ' +
        'Expected message matcher. You probably meant to use .then()')

    triggers = triggers.slice(0)
    triggers.push({
      address: address,
      message: message,
      type: type,
    })
    var cmd = {
      then: function(fnOrAddress, message) {
        observers.push({
          worker: isFunction(fnOrAddress) ?
                    fnOrAddress :
                    function() { this.send(fnOrAddress, message) },
          triggers: triggers
        })
        return me
      }
    }
    extendWithAddTriggerMethods(cmd, triggers)
    return cmd
  }

  var extendWithAddTriggerMethods = function(target, triggers) {
    [ 'on',
      'change',
      'next',
      'when'
    ].forEach(function(type) {
      target[type] = partial(addTrigger, type, triggers)
    })
  }

  extendWithAddTriggerMethods(me, [])

  var send = function(sent) {

    // Make a not if this is message differs from the
    // last message sent on the same address before changing it.
    var wasChanged = !deepEqual(lastMessageMap[sent.address], sent.message)

    // Store the injected message as the new last
    // message on this address.
    lastMessageMap[sent.address] = sent.message

    var matchingObservers = observers.filter(function(handler) {
      return !!find(handler.triggers, function(trigger) {

        if (trigger.address !== sent.address)
          return false;

        if (trigger.message && !deepEqual(trigger.message, sent.message))
          return false;

        if(trigger.type === 'change' && !wasChanged)
          return false

        // Observers of type when is only triggered when
        // sent a truthy message
        if(trigger.type === 'when'   && !sent.message)
          return false;

        // Peek triggers only wants values if
        // a sibling trigger does.
        if(trigger.type === 'peek')
          return false;

        return true
      })
    })

    matchingObservers.forEach(function(handler) {

      var receivedDeliveries = handler.triggers.map(function(trigger) {
        return {
          envelope: {
            address: trigger.address,
            message: lastMessageMap[trigger.address]
          },
          trigger: trigger.type
        }
      })

      var logEntry = {
        received: receivedDeliveries,
        worker: {
          name: handler.worker.name === '' ? null : handler.worker.name
        },
        sent: []
      }
      logEntries.push(logEntry)

      function loggingSend() {
        var envelope = envelopeFrom(arguments)
        logEntry.sent.push({
          envelope: envelope,
          couldDeliver: send(envelope)
        })
      }

      function logOnly() {
        logEntry.sent.push({
          envelope: envelopeFrom(arguments),
          couldDeliver: false,
          logOnly: true
        })
      }

      var commands = {
        send: loggingSend,
        log: logOnly
      }

      handler.worker.apply(commands, receivedDeliveries.map(function(delivery) {
        return delivery.envelope.message
      }))
      handler.triggers.forEach(function(trigger) {
        if (trigger.type === 'next')
          trigger.type = 'peek'
      })
    })

    return matchingObservers.length > 0
  }

  // Inject a message into the bus from the outside
  me.inject = function() {
    var envelope = envelopeFrom(arguments)

    // It's a common mistake to call .inject on the
    // main bus instead of this.send, catch that:
    if (isWorker(me.inject.caller))
      throw new Error(
        'Illegal call to inject method from inside handler. ' +
        'Use this.send instead.')

    var logEntry = {
      worker: {
        name: 'injector'
      },
      sent: []
    }
    logEntries.push(logEntry)

    logEntry.sent.push({
      envelope: envelope,
      couldDeliver: send(envelope)
    })

    return me

  }

  return me;
}

module.exports = createBus;
},{"deep-equal":3,"is-arguments":6,"mout/array/find":7,"mout/array/pluck":10,"mout/function/partial":14,"mout/lang/isArray":16,"mout/lang/isFunction":17,"mout/lang/isUndefined":19}],3:[function(require,module,exports){
var pSlice = Array.prototype.slice;
var objectKeys = require('./lib/keys.js');
var isArguments = require('./lib/is_arguments.js');

var deepEqual = module.exports = function (actual, expected, opts) {
  if (!opts) opts = {};
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();

  // 7.3. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (typeof actual != 'object' && typeof expected != 'object') {
    return opts.strict ? actual === expected : actual == expected;

  // 7.4. For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected, opts);
  }
}

function isUndefinedOrNull(value) {
  return value === null || value === undefined;
}

function isBuffer (x) {
  if (!x || typeof x !== 'object' || typeof x.length !== 'number') return false;
  if (typeof x.copy !== 'function' || typeof x.slice !== 'function') {
    return false;
  }
  if (x.length > 0 && typeof x[0] !== 'number') return false;
  return true;
}

function objEquiv(a, b, opts) {
  var i, key;
  if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return deepEqual(a, b, opts);
  }
  if (isBuffer(a)) {
    if (!isBuffer(b)) {
      return false;
    }
    if (a.length !== b.length) return false;
    for (i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b);
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepEqual(a[key], b[key], opts)) return false;
  }
  return true;
}

},{"./lib/is_arguments.js":4,"./lib/keys.js":5}],4:[function(require,module,exports){
var supportsArgumentsClass = (function(){
  return Object.prototype.toString.call(arguments)
})() == '[object Arguments]';

exports = module.exports = supportsArgumentsClass ? supported : unsupported;

exports.supported = supported;
function supported(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
};

exports.unsupported = unsupported;
function unsupported(object){
  return object &&
    typeof object == 'object' &&
    typeof object.length == 'number' &&
    Object.prototype.hasOwnProperty.call(object, 'callee') &&
    !Object.prototype.propertyIsEnumerable.call(object, 'callee') ||
    false;
};

},{}],5:[function(require,module,exports){
exports = module.exports = typeof Object.keys === 'function'
  ? Object.keys : shim;

exports.shim = shim;
function shim (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}

},{}],6:[function(require,module,exports){
var toString = Object.prototype.toString;

module.exports = function isArguments(value) {
	var str = toString.call(value);
	var isArguments = str === '[object Arguments]';
	if (!isArguments) {
		isArguments = str !== '[object Array]'
			&& value !== null
			&& typeof value === 'object'
			&& typeof value.length === 'number'
			&& value.length >= 0
			&& toString.call(value.callee) === '[object Function]';
	}
	return isArguments;
};


},{}],7:[function(require,module,exports){
var findIndex = require('./findIndex');

    /**
     * Returns first item that matches criteria
     */
    function find(arr, iterator, thisObj){
        var idx = findIndex(arr, iterator, thisObj);
        return idx >= 0? arr[idx] : void(0);
    }

    module.exports = find;



},{"./findIndex":8}],8:[function(require,module,exports){
var makeIterator = require('../function/makeIterator_');

    /**
     * Returns the index of the first item that matches criteria
     */
    function findIndex(arr, iterator, thisObj){
        iterator = makeIterator(iterator, thisObj);
        if (arr == null) {
            return -1;
        }

        var i = -1, len = arr.length;
        while (++i < len) {
            if (iterator(arr[i], i, arr)) {
                return i;
            }
        }

        return -1;
    }

    module.exports = findIndex;


},{"../function/makeIterator_":13}],9:[function(require,module,exports){
var makeIterator = require('../function/makeIterator_');

    /**
     * Array map
     */
    function map(arr, callback, thisObj) {
        callback = makeIterator(callback, thisObj);
        var results = [];
        if (arr == null){
            return results;
        }

        var i = -1, len = arr.length;
        while (++i < len) {
            results[i] = callback(arr[i], i, arr);
        }

        return results;
    }

     module.exports = map;


},{"../function/makeIterator_":13}],10:[function(require,module,exports){
var map = require('./map');

    /**
     * Extract a list of property values.
     */
    function pluck(arr, propName){
        return map(arr, propName);
    }

    module.exports = pluck;



},{"./map":9}],11:[function(require,module,exports){


    var arrSlice = Array.prototype.slice;

    /**
     * Create slice of source array or array-like object
     */
    function slice(arr, start, end){
        return arrSlice.call(arr, start, end);
    }

    module.exports = slice;



},{}],12:[function(require,module,exports){


    /**
     * Returns the first argument provided to it.
     */
    function identity(val){
        return val;
    }

    module.exports = identity;



},{}],13:[function(require,module,exports){
var identity = require('./identity');
var prop = require('./prop');
var deepMatches = require('../object/deepMatches');

    /**
     * Converts argument into a valid iterator.
     * Used internally on most array/object/collection methods that receives a
     * callback/iterator providing a shortcut syntax.
     */
    function makeIterator(src, thisObj){
        if (src == null) {
            return identity;
        }
        switch(typeof src) {
            case 'function':
                // function is the first to improve perf (most common case)
                // also avoid using `Function#call` if not needed, which boosts
                // perf a lot in some cases
                return (typeof thisObj !== 'undefined')? function(val, i, arr){
                    return src.call(thisObj, val, i, arr);
                } : src;
            case 'object':
                return function(val){
                    return deepMatches(val, src);
                };
            case 'string':
            case 'number':
                return prop(src);
        }
    }

    module.exports = makeIterator;



},{"../object/deepMatches":21,"./identity":12,"./prop":15}],14:[function(require,module,exports){
var slice = require('../array/slice');

    /**
     * Creates a partially applied function.
     */
    function partial(fn, var_args){
        var argsArr = slice(arguments, 1); //curried args
        return function(){
            return fn.apply(this, argsArr.concat(slice(arguments)));
        };
    }

    module.exports = partial;



},{"../array/slice":11}],15:[function(require,module,exports){


    /**
     * Returns a function that gets a property of the passed object
     */
    function prop(name){
        return function(obj){
            return obj[name];
        };
    }

    module.exports = prop;



},{}],16:[function(require,module,exports){
var isKind = require('./isKind');
    /**
     */
    var isArray = Array.isArray || function (val) {
        return isKind(val, 'Array');
    };
    module.exports = isArray;


},{"./isKind":18}],17:[function(require,module,exports){
var isKind = require('./isKind');
    /**
     */
    function isFunction(val) {
        return isKind(val, 'Function');
    }
    module.exports = isFunction;


},{"./isKind":18}],18:[function(require,module,exports){
var kindOf = require('./kindOf');
    /**
     * Check if value is from a specific "kind".
     */
    function isKind(val, kind){
        return kindOf(val) === kind;
    }
    module.exports = isKind;


},{"./kindOf":20}],19:[function(require,module,exports){

    var UNDEF;

    /**
     */
    function isUndef(val){
        return val === UNDEF;
    }
    module.exports = isUndef;


},{}],20:[function(require,module,exports){


    var _rKind = /^\[object (.*)\]$/,
        _toString = Object.prototype.toString,
        UNDEF;

    /**
     * Gets the "kind" of value. (e.g. "String", "Number", etc)
     */
    function kindOf(val) {
        if (val === null) {
            return 'Null';
        } else if (val === UNDEF) {
            return 'Undefined';
        } else {
            return _rKind.exec( _toString.call(val) )[1];
        }
    }
    module.exports = kindOf;


},{}],21:[function(require,module,exports){
var forOwn = require('./forOwn');
var isArray = require('../lang/isArray');

    function containsMatch(array, pattern) {
        var i = -1, length = array.length;
        while (++i < length) {
            if (deepMatches(array[i], pattern)) {
                return true;
            }
        }

        return false;
    }

    function matchArray(target, pattern) {
        var i = -1, patternLength = pattern.length;
        while (++i < patternLength) {
            if (!containsMatch(target, pattern[i])) {
                return false;
            }
        }

        return true;
    }

    function matchObject(target, pattern) {
        var result = true;
        forOwn(pattern, function(val, key) {
            if (!deepMatches(target[key], val)) {
                // Return false to break out of forOwn early
                return (result = false);
            }
        });

        return result;
    }

    /**
     * Recursively check if the objects match.
     */
    function deepMatches(target, pattern){
        if (target && typeof target === 'object') {
            if (isArray(target) && isArray(pattern)) {
                return matchArray(target, pattern);
            } else {
                return matchObject(target, pattern);
            }
        } else {
            return target === pattern;
        }
    }

    module.exports = deepMatches;



},{"../lang/isArray":16,"./forOwn":23}],22:[function(require,module,exports){


    var _hasDontEnumBug,
        _dontEnums;

    function checkDontEnum(){
        _dontEnums = [
                'toString',
                'toLocaleString',
                'valueOf',
                'hasOwnProperty',
                'isPrototypeOf',
                'propertyIsEnumerable',
                'constructor'
            ];

        _hasDontEnumBug = true;

        for (var key in {'toString': null}) {
            _hasDontEnumBug = false;
        }
    }

    /**
     * Similar to Array/forEach but works over object properties and fixes Don't
     * Enum bug on IE.
     * based on: http://whattheheadsaid.com/2010/10/a-safer-object-keys-compatibility-implementation
     */
    function forIn(obj, fn, thisObj){
        var key, i = 0;
        // no need to check if argument is a real object that way we can use
        // it for arrays, functions, date, etc.

        //post-pone check till needed
        if (_hasDontEnumBug == null) checkDontEnum();

        for (key in obj) {
            if (exec(fn, obj, key, thisObj) === false) {
                break;
            }
        }

        if (_hasDontEnumBug) {
            while (key = _dontEnums[i++]) {
                // since we aren't using hasOwn check we need to make sure the
                // property was overwritten
                if (obj[key] !== Object.prototype[key]) {
                    if (exec(fn, obj, key, thisObj) === false) {
                        break;
                    }
                }
            }
        }
    }

    function exec(fn, obj, key, thisObj){
        return fn.call(thisObj, obj[key], key, obj);
    }

    module.exports = forIn;



},{}],23:[function(require,module,exports){
var hasOwn = require('./hasOwn');
var forIn = require('./forIn');

    /**
     * Similar to Array/forEach but works over object properties and fixes Don't
     * Enum bug on IE.
     * based on: http://whattheheadsaid.com/2010/10/a-safer-object-keys-compatibility-implementation
     */
    function forOwn(obj, fn, thisObj){
        forIn(obj, function(val, key){
            if (hasOwn(obj, key)) {
                return fn.call(thisObj, obj[key], key, obj);
            }
        });
    }

    module.exports = forOwn;



},{"./forIn":22,"./hasOwn":24}],24:[function(require,module,exports){


    /**
     * Safer Object.hasOwnProperty
     */
     function hasOwn(obj, prop){
         return Object.prototype.hasOwnProperty.call(obj, prop);
     }

     module.exports = hasOwn;



},{}],25:[function(require,module,exports){
module.exports = function (string) {
  return string.charAt(0).toUpperCase() + string.substring(1);
}

module.exports.words = function (string) {
  return string.replace(/(^|\W)(\w)/g, function (m) {
    return m.toUpperCase()
  })
}

},{}],26:[function(require,module,exports){
var isKind = require('./isKind');
    /**
     */
    function isBoolean(val) {
        return isKind(val, 'Boolean');
    }
    module.exports = isBoolean;


},{"./isKind":27}],27:[function(require,module,exports){
module.exports=require(18)
},{"./kindOf":30}],28:[function(require,module,exports){
var isKind = require('./isKind');
    /**
     */
    function isNumber(val) {
        return isKind(val, 'Number');
    }
    module.exports = isNumber;


},{"./isKind":27}],29:[function(require,module,exports){
var isKind = require('./isKind');
    /**
     */
    function isString(val) {
        return isKind(val, 'String');
    }
    module.exports = isString;


},{"./isKind":27}],30:[function(require,module,exports){
module.exports=require(20)
},{}],31:[function(require,module,exports){
module.exports=require(11)
},{}],32:[function(require,module,exports){
module.exports=require(14)
},{"../array/slice":31}],33:[function(require,module,exports){
module.exports=require(19)
},{}],34:[function(require,module,exports){
var partial = require('mout/function/partial')
var isUndefined = require('mout/lang/isUndefined')

module.exports = function() {

  var me = {
    instructions: [],
    given: function(givenAddress, givenMessage) {
      me.instructions.push([ 'given', givenAddress, givenMessage ])
      return me
    },
    expectAndSimulate: function(expect, simulate) {
      me.instructions.push(
        ['expect', expect[0], expect[1], simulate[0], simulate[1]])
      return me
    },
    expect: function(expectedAddress, expectedMessage) {
      me.instructions.push( [ 'expect', expectedAddress, expectedMessage ])
      return me
    },
    check: function(bus) {
      me.instructions.forEach(function(ins) {
        if (ins[0] === 'given') {
          bus.on('spec-start').then(function given() {
            this.send(ins[1], ins[2])
          })
        }
        if (ins[0] === 'expect') {
          var expectedAddress = ins[1]
          var expectedMessage = ins[2]
          var simulateAddress = ins[3]
          var simulateMessage = ins[4]

          var isOk = false
          bus.on(expectedAddress).then(function expectationMet(actualMessage) {
            if (actualMessage === expectedMessage || isUndefined(expectedMessage)) { // TODO: try removing this if
              isOk = true
              if (simulateAddress) {
                this.send(simulateAddress,
                  isUndefined(simulateMessage) ? true : simulateMessage )
              }
              this.log(expectedAddress, expectedMessage)
            }
          })

          bus.on('spec-done').then(function expectationNotMet() {
            if(!isOk)
              this.log(expectedAddress, expectedMessage)
          })
        }

      })
      bus.inject('spec-start')
      bus.inject('spec-done')
    },
    extend: function(parent) {
      me.instructions.concat(parent.instructions)
      return me
    }
  }

  return me
}
},{"mout/function/partial":32,"mout/lang/isUndefined":33}],35:[function(require,module,exports){

var clean = require('to-no-case');


/**
 * Expose `toSpaceCase`.
 */

module.exports = toSpaceCase;


/**
 * Convert a `string` to space case.
 *
 * @param {String} string
 * @return {String}
 */


function toSpaceCase (string) {
  return clean(string).replace(/[\W_]+(.|$)/g, function (matches, match) {
    return match ? ' ' + match : '';
  });
}
},{"to-no-case":36}],36:[function(require,module,exports){

/**
 * Expose `toNoCase`.
 */

module.exports = toNoCase;


/**
 * Test whether a string is camel-case.
 */

var hasSpace = /\s/;
var hasSeparator = /[\W_]/;


/**
 * Remove any starting case from a `string`, like camel or snake, but keep
 * spaces and punctuation that may be important otherwise.
 *
 * @param {String} string
 * @return {String}
 */

function toNoCase (string) {
  if (hasSpace.test(string)) return string.toLowerCase();
  if (hasSeparator.test(string)) return unseparate(string).toLowerCase();
  return uncamelize(string).toLowerCase();
}


/**
 * Separator splitter.
 */

var separatorSplitter = /[\W_]+(.|$)/g;


/**
 * Un-separate a `string`.
 *
 * @param {String} string
 * @return {String}
 */

function unseparate (string) {
  return string.replace(separatorSplitter, function (m, next) {
    return next ? ' ' + next : '';
  });
}


/**
 * Camelcase splitter.
 */

var camelSplitter = /(.)([A-Z]+)/g;


/**
 * Un-camelcase a `string`.
 *
 * @param {String} string
 * @return {String}
 */

function uncamelize (string) {
  return string.replace(camelSplitter, function (m, previous, uppers) {
    return previous + ' ' + uppers.toLowerCase().split('').join(' ');
  });
}
},{}],37:[function(require,module,exports){
var capitalize = require('capitalize')
var space = require('to-space-case')
var isBoolean = require('mout/lang/isBoolean')
var isNumber = require('mout/lang/isNumber')
var isString = require('mout/lang/isString')

var pretty = function(logEntries) {
  return logEntries
    .filter(function(entry) {
      if (entry.worker.name === 'injector')
        return false
      return true
    })
    .map(function(entry) {
      if (entry.worker.name === 'given')
        entry.received = []

      entry.received = entry.received
        .filter(function(delivery) {
          if (entry.worker.name === 'expectationMet' ||
              entry.worker.name === 'expectationNotMet') return false
          return true
        }).map(function(delivery) {

          var message = delivery.envelope.message
          if (isBoolean(message)) {
            delivery.messageClass = 'boolean'
          } else if(isNumber(message)) {
            delivery.messageClass = 'number'
          } else if(isString(message)) {
            delivery.messageClass = 'string'
            delivery.envelope.message = '"' + message + '"'
          } else {
            delivery.messageClass = 'object'
            delivery.envelope.message = JSON.stringify(message)
          }

          delivery.statusText = 'on'
          return delivery;
        })
      entry.sent = entry.sent.map(function(delivery) {

        var message = delivery.envelope.message
        if (isBoolean(message)) {
          delivery.messageClass = 'boolean'
        } else if(isNumber(message)) {
          delivery.messageClass = 'number'
        } else if(isString(message)) {
          delivery.messageClass = 'string'
          delivery.envelope.message = '"' + message + '"'
        } else {
          delivery.messageClass = 'object'
          delivery.envelope.message = JSON.stringify(message)
        }

        if (delivery.logOnly) {
          delivery.statusText = 'Logged'
          delivery.statusLook = 'normal'
          return delivery
        }

        delivery.statusText =
          delivery.couldDeliver ? 'Delivered' : 'Undeliverable'
        delivery.statusLook = delivery.couldDeliver ?
          'normal' : 'shaky'

        return delivery
      })

      entry.worker.nameFormatted =
        entry.worker.name === null
        ? 'Anonymous'
        : capitalize(space(entry.worker.name))
      return entry
    })




}

module.exports = pretty
},{"capitalize":25,"mout/lang/isBoolean":26,"mout/lang/isNumber":28,"mout/lang/isString":29,"to-space-case":35}]},{},[1])