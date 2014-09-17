(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],3:[function(require,module,exports){
(function (process){
/**
 * Copyright 2013-2014 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @providesModule copyProperties
 */

/**
 * Copy properties from one or more objects (up to 5) into the first object.
 * This is a shallow copy. It mutates the first object and also returns it.
 *
 * NOTE: `arguments` has a very significant performance penalty, which is why
 * we don't support unlimited arguments.
 */
function copyProperties(obj, a, b, c, d, e, f) {
  obj = obj || {};

  if ("production" !== process.env.NODE_ENV) {
    if (f) {
      throw new Error('Too many arguments passed to copyProperties');
    }
  }

  var args = [a, b, c, d, e];
  var ii = 0, v;
  while (args[ii]) {
    v = args[ii++];
    for (var k in v) {
      obj[k] = v[k];
    }

    // IE ignores toString in object iteration.. See:
    // webreflection.blogspot.com/2007/07/quick-fix-internet-explorer-and.html
    if (v.hasOwnProperty && v.hasOwnProperty('toString') &&
        (typeof v.toString != 'undefined') && (obj.toString !== v.toString)) {
      obj.toString = v.toString;
    }
  }

  return obj;
}

module.exports = copyProperties;

}).call(this,require("oMfpAn"))
},{"oMfpAn":2}],4:[function(require,module,exports){
(function (process){
/**
 * Copyright 2013-2014 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @providesModule invariant
 */

"use strict";

/**
 * Use invariant() to assert state which your program assumes to be true.
 *
 * Provide sprintf-style format (only %s is supported) and arguments
 * to provide information about what broke and what you were
 * expecting.
 *
 * The invariant message will be stripped in production, but the invariant
 * will remain to ensure logic does not differ in production.
 */

var invariant = function(condition, format, a, b, c, d, e, f) {
  if ("production" !== process.env.NODE_ENV) {
    if (format === undefined) {
      throw new Error('invariant requires an error message argument');
    }
  }

  if (!condition) {
    var error;
    if (format === undefined) {
      error = new Error(
        'Minified exception occurred; use the non-minified dev environment ' +
        'for the full error message and additional helpful warnings.'
      );
    } else {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      error = new Error(
        'Invariant Violation: ' +
        format.replace(/%s/g, function() { return args[argIndex++]; })
      );
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
};

module.exports = invariant;

}).call(this,require("oMfpAn"))
},{"oMfpAn":2}],5:[function(require,module,exports){
(function (process){
/**
 * Copyright 2013-2014 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @providesModule keyMirror
 * @typechecks static-only
 */

"use strict";

var invariant = require("./invariant");

/**
 * Constructs an enumeration with keys equal to their value.
 *
 * For example:
 *
 *   var COLORS = keyMirror({blue: null, red: null});
 *   var myColor = COLORS.blue;
 *   var isColorValid = !!COLORS[myColor];
 *
 * The last line could not be performed if the values of the generated enum were
 * not equal to their keys.
 *
 *   Input:  {key1: val1, key2: val2}
 *   Output: {key1: key1, key2: key2}
 *
 * @param {object} obj
 * @return {object}
 */
var keyMirror = function(obj) {
  var ret = {};
  var key;
  ("production" !== process.env.NODE_ENV ? invariant(
    obj instanceof Object && !Array.isArray(obj),
    'keyMirror(...): Argument must be an object.'
  ) : invariant(obj instanceof Object && !Array.isArray(obj)));
  for (key in obj) {
    if (!obj.hasOwnProperty(key)) {
      continue;
    }
    ret[key] = key;
  }
  return ret;
};

module.exports = keyMirror;

}).call(this,require("oMfpAn"))
},{"./invariant":4,"oMfpAn":2}],6:[function(require,module,exports){
/**
 * Copyright 2013-2014 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @providesModule merge
 */

"use strict";

var mergeInto = require("./mergeInto");

/**
 * Shallow merges two structures into a return value, without mutating either.
 *
 * @param {?object} one Optional object with properties to merge from.
 * @param {?object} two Optional object with properties to merge from.
 * @return {object} The shallow extension of one by two.
 */
var merge = function(one, two) {
  var result = {};
  mergeInto(result, one);
  mergeInto(result, two);
  return result;
};

module.exports = merge;

},{"./mergeInto":8}],7:[function(require,module,exports){
(function (process){
/**
 * Copyright 2013-2014 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @providesModule mergeHelpers
 *
 * requiresPolyfills: Array.isArray
 */

"use strict";

var invariant = require("./invariant");
var keyMirror = require("./keyMirror");

/**
 * Maximum number of levels to traverse. Will catch circular structures.
 * @const
 */
var MAX_MERGE_DEPTH = 36;

/**
 * We won't worry about edge cases like new String('x') or new Boolean(true).
 * Functions are considered terminals, and arrays are not.
 * @param {*} o The item/object/value to test.
 * @return {boolean} true iff the argument is a terminal.
 */
var isTerminal = function(o) {
  return typeof o !== 'object' || o === null;
};

var mergeHelpers = {

  MAX_MERGE_DEPTH: MAX_MERGE_DEPTH,

  isTerminal: isTerminal,

  /**
   * Converts null/undefined values into empty object.
   *
   * @param {?Object=} arg Argument to be normalized (nullable optional)
   * @return {!Object}
   */
  normalizeMergeArg: function(arg) {
    return arg === undefined || arg === null ? {} : arg;
  },

  /**
   * If merging Arrays, a merge strategy *must* be supplied. If not, it is
   * likely the caller's fault. If this function is ever called with anything
   * but `one` and `two` being `Array`s, it is the fault of the merge utilities.
   *
   * @param {*} one Array to merge into.
   * @param {*} two Array to merge from.
   */
  checkMergeArrayArgs: function(one, two) {
    ("production" !== process.env.NODE_ENV ? invariant(
      Array.isArray(one) && Array.isArray(two),
      'Tried to merge arrays, instead got %s and %s.',
      one,
      two
    ) : invariant(Array.isArray(one) && Array.isArray(two)));
  },

  /**
   * @param {*} one Object to merge into.
   * @param {*} two Object to merge from.
   */
  checkMergeObjectArgs: function(one, two) {
    mergeHelpers.checkMergeObjectArg(one);
    mergeHelpers.checkMergeObjectArg(two);
  },

  /**
   * @param {*} arg
   */
  checkMergeObjectArg: function(arg) {
    ("production" !== process.env.NODE_ENV ? invariant(
      !isTerminal(arg) && !Array.isArray(arg),
      'Tried to merge an object, instead got %s.',
      arg
    ) : invariant(!isTerminal(arg) && !Array.isArray(arg)));
  },

  /**
   * @param {*} arg
   */
  checkMergeIntoObjectArg: function(arg) {
    ("production" !== process.env.NODE_ENV ? invariant(
      (!isTerminal(arg) || typeof arg === 'function') && !Array.isArray(arg),
      'Tried to merge into an object, instead got %s.',
      arg
    ) : invariant((!isTerminal(arg) || typeof arg === 'function') && !Array.isArray(arg)));
  },

  /**
   * Checks that a merge was not given a circular object or an object that had
   * too great of depth.
   *
   * @param {number} Level of recursion to validate against maximum.
   */
  checkMergeLevel: function(level) {
    ("production" !== process.env.NODE_ENV ? invariant(
      level < MAX_MERGE_DEPTH,
      'Maximum deep merge depth exceeded. You may be attempting to merge ' +
      'circular structures in an unsupported way.'
    ) : invariant(level < MAX_MERGE_DEPTH));
  },

  /**
   * Checks that the supplied merge strategy is valid.
   *
   * @param {string} Array merge strategy.
   */
  checkArrayStrategy: function(strategy) {
    ("production" !== process.env.NODE_ENV ? invariant(
      strategy === undefined || strategy in mergeHelpers.ArrayStrategies,
      'You must provide an array strategy to deep merge functions to ' +
      'instruct the deep merge how to resolve merging two arrays.'
    ) : invariant(strategy === undefined || strategy in mergeHelpers.ArrayStrategies));
  },

  /**
   * Set of possible behaviors of merge algorithms when encountering two Arrays
   * that must be merged together.
   * - `clobber`: The left `Array` is ignored.
   * - `indexByIndex`: The result is achieved by recursively deep merging at
   *   each index. (not yet supported.)
   */
  ArrayStrategies: keyMirror({
    Clobber: true,
    IndexByIndex: true
  })

};

module.exports = mergeHelpers;

}).call(this,require("oMfpAn"))
},{"./invariant":4,"./keyMirror":5,"oMfpAn":2}],8:[function(require,module,exports){
/**
 * Copyright 2013-2014 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @providesModule mergeInto
 * @typechecks static-only
 */

"use strict";

var mergeHelpers = require("./mergeHelpers");

var checkMergeObjectArg = mergeHelpers.checkMergeObjectArg;
var checkMergeIntoObjectArg = mergeHelpers.checkMergeIntoObjectArg;

/**
 * Shallow merges two structures by mutating the first parameter.
 *
 * @param {object|function} one Object to be merged into.
 * @param {?object} two Optional object with properties to merge from.
 */
function mergeInto(one, two) {
  checkMergeIntoObjectArg(one);
  if (two != null) {
    checkMergeObjectArg(two);
    for (var key in two) {
      if (!two.hasOwnProperty(key)) {
        continue;
      }
      one[key] = two[key];
    }
  }
}

module.exports = mergeInto;

},{"./mergeHelpers":7}],9:[function(require,module,exports){

// 声明所有的action
// 由哪个dispatcher负责分发
// 分发的payload中的actionType是什么
// 这个action所需要的参数, 接收并传给分发器

var ChatDispatcher = require('../dispatcher/ChatDispatcher');
var ChatConstants = require('../constants/ChatConstants');

var MovieActions = {
    // start time as id
    create: function(word, id){
        ChatDispatcher.handleMovieAction({
            actionType: ChatConstants.WORD_CREATE,
            word: word,
            id: id
        })
    },
    update: function(id, updates){
        ChatDispatcher.handleMovieAction({
            actionType: ChatConstants.WORD_UPDATE,
            id: id,
            updates: updates
        });
    }
};


module.exports = MovieActions;


},{"../constants/ChatConstants":13,"../dispatcher/ChatDispatcher":16}],10:[function(require,module,exports){
/**
 * @jsx React.DOM
 */ 



var ChatStore = require('../stores/ChatStore.js')

var ChatWord = require('./ChatWord.react.js');

function getAllData(){
    return {
        list: ChatStore.getAll()
    };
};

var scollEle = null, lastScrollHeight = 0;
var scrollCtn = null, ctnHeight = 0;
function checkAndScroll(){
    var newH = scrollCtn.scrollHeight;
    if( newH > lastScrollHeight ){
        scollEle.css({
            '-webkit-transform': 'translateY(-'+ (newH - ctnHeight)+'px)',
            '-moz-transform': 'translateY(-'+ (newH - ctnHeight)+'px)',
            'transform': 'translateY(-'+ (newH - ctnHeight)+'px)'
        });
        // console.log( newH - ctnHeight );
        lastScrollHeight = newH;
    }
}


var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

var ChatList = React.createClass({displayName: 'ChatList',
    getInitialState: function(){
        return getAllData();
    },
    componentDidMount: function() {
        // 初始化消息滚动
        scollEle = $(this.props.scrollEle);
        scrollCtn = $(this.props.scrollCtn).get(0);
        ctnHeight = $(scrollCtn).height();
        checkAndScroll();
        
        // 添加change监听
        ChatStore.addChangeListener( this._onChange );
    },
    componentDidUpdate: function(){
        checkAndScroll();
    },
    componentWillMount: function() {
        ChatStore.removeChangeListener( this._onChange );
    },
    render: function(){
        var nodes = this.state.list.map(function(item, i){
            return ChatWord({item: item, key: i});
        });

        return (
            React.DOM.ul({id: "msg-list"}, 
                ReactCSSTransitionGroup({transitionName: "msg-item"}, 
                    nodes
                )
            )
        );
    },
    _onChange: function(){
        this.setState( getAllData() )
    }
});

module.exports = ChatList;
},{"../stores/ChatStore.js":20,"./ChatWord.react.js":11}],11:[function(require,module,exports){
/**
 * @jsx React.DOM
 */ 

 function buildMsgItem(msg){
    return (
        React.DOM.li({className: "msg-item"}, 
            React.DOM.img({src: msg.avatar, className: "avatar"}), 
            React.DOM.div({className: "msg-content"}, 
                React.DOM.span({className: "msg-user-name"}, msg.alias), 
                React.DOM.span({className: "msg-text"}, msg.word)
            )
        )
        );
    // return (
    //     <li className="msg-item">
    //         <img src={'./img/avatar/'+msg.user+'.png'} className="avatar" />
    //         <div className="msg-content">
    //             <span className="msg-user-name">{msg.user}</span>
    //             <span className="msg-text">{msg.word}</span>
    //         </div>
    //     </li>
    //     );
 }


var ChatWord = React.createClass({displayName: 'ChatWord',
    getInitialState: function(){
        return {};
    },
    componentDidUpdate: function(){
        // console.log(this.props.item.word);
    },
    render: function(){
        return buildMsgItem(this.props.item);
    }
});


module.exports = ChatWord;
},{}],12:[function(require,module,exports){


var MovieAction = require('../actions/MovieAction.js');
var dialogData = require('../data/dialogData.js');
var userData = require('../data/userData.js');
// source data: dialog

function getUserInfo(identifer){
    return userData[identifer];
}

// string word, duration of ms, offset of ms
function typeWords(word, dur, offSet, callback){
    if(!offSet){
        offSet = 0;
    }
    var arr = word.split('');

    arr.forEach(function(el, i){
        callback( word.substr(0, 1) );
        setTimeout(function(){
            callback(word.substr(0, i+1));
        }, (dur*(i+1)/arr.length) + offSet);
    });
}


var MovieCtrl = {
    start: function(){
        // setTimeout and send action...
        for( var i in dialogData ){
            (function(key){
                var timeout = key;
                var id = key;
                setTimeout(function(){
                    var item = dialogData[key];
                    var userInfo = getUserInfo(item.user);
                    MovieAction.create({
                        alias: userInfo.alias,
                        avatar: 'img/avatar/'+userInfo.avatar,
                        word: ''
                    }, id);

                    (function(str, dur, offset){
                        var diaID = offset;
                        typeWords(str, dur, 0, function(partial){
                            MovieAction.update( diaID, {word: partial} );
                        });
                    })(item.word, item.dur, Number(timeout));

                },timeout);
            })(i);
        }
    }
};

module.exports = MovieCtrl;
},{"../actions/MovieAction.js":9,"../data/dialogData.js":14,"../data/userData.js":15}],13:[function(require,module,exports){
var keyMirror = require('react/lib/keyMirror');

module.exports = keyMirror({
    WORD_CREATE: null,
    WORD_UPDATE: null
});
},{"react/lib/keyMirror":5}],14:[function(require,module,exports){
var data = {
    2247: {
        user: 'mark',
        word: 'I think I\'ve come up with something...',
        dur: 3561 - 2347
    },
    3640: {
        user: 'wardo',
        word: 'that looks good. That looks really good.',
        dur: 5285 - 3640
    },
    5420: {
        user: 'mark',
        word: 'It\'s gonna be online any second.',
        dur:  6570 - 5420
    },
    6650: {
        user: 'dustin',
        word: 'Who should we send it to first?',
        dur: 7491 - 6650
    },
    7690: {
        user: 'mark',
        word: 'Just a couple of people... The question is... who are they gonna send it to?',
        dur: 10223 - 7690
    },
    10325: {
        user: 'mary',
        word: 'The site got 2,200 hits within two hours???',
        dur: 12952 - 10325
    },
    13053: {
        user: 'mark',
        word: 'THOUSAND... 22,000.',
        dur: 14576 - 13053
    },
    14600: {
        user: 'mary',
        word: 'WOW!',
        dur: 14700 - 14600
    },
    14900: {
        user: 'erica',
        word: 'You called me a BITCH on the Internet.',
        dur: 16280 - 14900
    },
    16390: {
        user: 'mark',
        word: 'Doesn\'t anybody have a sense of humor?',
        dur: 17306 - 16390
    },
    17380: {
        user: 'erica',
        word: 'The Internet\'s not written in pencil, Mark, it\'s written in ink.',
        dur:  19370 - 17380
    },
    19560: {
        user: 'wardo',
        word: 'u think maybe we shouldn\'t shut it down before we get into trouble?',
        dur: 21600 - 19560
    },
    21680: {
        user: 'divya',
        word: 'He stole our website!!!',
        dur: 22480 - 21680
    },
    22600: {
        user: 'wardo',
        word: 'They\'re saying that we stole The Facebook',
        dur: 23980 - 22600
    },
    24200: {
        user: 'mark',
        word: 'I KNOW what it says.',
        dur: 24900 - 24200
    },
    25000: {
        user: 'wardo',
        word: 'so did we???',
        dur: 25320 - 25000
    },
    25550: {
        user: 'mark',
        word: 'They came to me with an idea, I had a better one.',
        dur: 26950 - 25550
    },
    27050: {
        user: 'chris',
        word: 'He made The Facebook?',
        dur: 27820 - 27050
    },
    27880: {
        user: 'dustin',
        word: 'Who are the girls',
        dur: 28339 - 27880
    },
    28520: {
        user: 'wardo',
        word: 'We have groupies.',
        dur: 28960 - 28520
    },
    29100: {
        user: 'tyler',
        word: 'This idea is potentially worth millions of dollars.',
        dur: 31100 - 29100
    },
    31250: {
        user: 'larry',
        word: 'Millions?',
        dur: 31464 - 31250
    },
    31868: {
        user: 'sean',
        word: 'A million $ isn\'t cool. You know what\'s cool?',
        dur: 33494 - 31868
    },
    33697: {
        user: 'wardo',
        word: 'U?',
        dur: 33900 - 33697
    },
    34203: {
        user: 'sean',
        word: 'A BILLION $$$\'s.',
        dur: 35010 - 34203
    },
    35230: {
        user: 'wardo',
        word: 'We don\'t need him.',
        dur: 36127 - 35230
    },
    36250: {
        user: 'tyler',
        word: 'Let\'s SUE him in federal court.',
        dur: 37654 - 36250
    },
    37830: {
        user: 'mark',
        word: 'you\'re going to get left behind. It\'s moving faster...',
        dur: 38779 - 37830
    },
    39260: {
        user: 'wardo',
        word: 'what do u mean...',
        dur: 39685 - 39260
    },
    39500: {
        user: 'mark',
        word: 'than any of us ever imagined it would move',
        dur: 40500 - 39500
    },
    40550: {
        user: 'wardo',
        word: 'get left behind????',
        dur: 40780 - 40550
    },
    41170: {
        user: 'cameron',
        word: 'We\'re gentlemen of Harvard. You don\'t sue people.',
        dur: 43400 - 41170
    },
    43520: {
        user: 'sean',
        word: 'This is OUR time!!',
        dur: 44300 - 43520
    },
    44480: {
        user: 'wardo',
        word: 'It\'s gonna be like I\'m not a part of Facebook.',
        dur: 46000 - 44480
    },
    46050: {
        user: 'sean',
        word: 'You\'re not a part of Facebook.',
        dur: 46930 - 46050
    },
    47040: {
        user: 'divya',
        word: 'I can\'t wait to stand over your shoulder and watch you write us a check.',
        dur: 49280 - 47040
    },
    49380: {
        user: 'wardo',
        word: 'Is there anything that you need to tell me???',
        dur: 50880 - 49380
    },
    51020: {
        user: 'mark',
        word: 'your actions could have permanently destroyed EVERYTHING I\'ve been working on.',
        dur: 53065 - 51020
    },
    53200: {
        user: 'wardo',
        word: 'WE have been working on!!',
        dur: 53940 - 53200
    },
    54087: {
        user: 'mark',
        word: 'Do u like being a joke??? Do u wanna go back to that?',
        dur: 55550 - 54087
    },
    55630: {
        user: 'wardo',
        word: 'Mark!!!',
        dur: 55840 - 55630
    }
};

module.exports = data;
},{}],15:[function(require,module,exports){
var userData = {
    mark: {
        alias: 'Mark Zuckerberg',
        avatar: 'mark.png'
    },
    wardo: {
        alias: 'Eduardo Saverin',
        avatar: 'wardo.png'
    },
    dustin: {
        alias: 'Dustin Moskovitz',
        avatar: 'dustin.png'
    },
    mary: {
        alias: 'Marylin Delpy',
        avatar: 'mary.png'
    },
    erica: {
        alias: 'Erica Albright',
        avatar: 'erica.png'
    },
    divya: {
        alias: 'Divya Narendra',
        avatar: 'divya.png'
    },
    chris: {
        alias: 'Christy Lee',
        avatar: 'chris.png'
    },
    tyler: {
        alias: 'Tyler Winklevoss',
        avatar: 'tyler.png'
    },
    larry: {
        alias: 'Larry Summers',
        avatar: 'larry.png'
    },
    sean: {
        alias: 'Sean Parker',
        avatar: 'sean.png'
    },
    cameron: {
        alias: 'Cameron Winklevoss',
        avatar: 'cameron.png'
    }
};

module.exports = userData;
},{}],16:[function(require,module,exports){
var Dispatcher = require('./Dispatcher');


// dispatcher 真的很简单, 对于现在的todoapp来说
// 添加一个处理viewaction的方法, 进行分发... 分发的参数可以称作payload
// 在相应的store中, 将action的handler注册在dispatcher上

var copyProperties = require('react/lib/copyProperties');

var ChatDispatcher = copyProperties(new Dispatcher(), {
    handleMovieAction: function(action){
        this.dispatch({
            source: 'MOVIE_ACTION',
            action: action
        });
    }
});

module.exports = ChatDispatcher;
},{"./Dispatcher":17,"react/lib/copyProperties":3}],17:[function(require,module,exports){
/*
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule Dispatcher
 * @typechecks
 */

var invariant = require('./invariant');

var _lastID = 1;
var _prefix = 'ID_';

/**
 * Dispatcher is used to broadcast payloads to registered callbacks. This is
 * different from generic pub-sub systems in two ways:
 *
 *   1) Callbacks are not subscribed to particular events. Every payload is
 *      dispatched to every registered callback.
 *   2) Callbacks can be deferred in whole or part until other callbacks have
 *      been executed.
 *
 * For example, consider this hypothetical flight destination form, which
 * selects a default city when a country is selected:
 *
 *   var flightDispatcher = new Dispatcher();
 *
 *   // Keeps track of which country is selected
 *   var CountryStore = {country: null};
 *
 *   // Keeps track of which city is selected
 *   var CityStore = {city: null};
 *
 *   // Keeps track of the base flight price of the selected city
 *   var FlightPriceStore = {price: null}
 *
 * When a user changes the selected city, we dispatch the payload:
 *
 *   flightDispatcher.dispatch({
 *     actionType: 'city-update',
 *     selectedCity: 'paris'
 *   });
 *
 * This payload is digested by `CityStore`:
 *
 *   flightDispatcher.register(function(payload)) {
 *     if (payload.actionType === 'city-update') {
 *       CityStore.city = payload.selectedCity;
 *     }
 *   });
 *
 * When the user selects a country, we dispatch the payload:
 *
 *   flightDispatcher.dispatch({
 *     actionType: 'country-update',
 *     selectedCountry: 'australia'
 *   });
 *
 * This payload is digested by both stores:
 *
 *    CountryStore.dispatchToken = flightDispatcher.register(function(payload) {
 *     if (payload.actionType === 'country-update') {
 *       CountryStore.country = payload.selectedCountry;
 *     }
 *   });
 *
 * When the callback to update `CountryStore` is registered, we save a reference
 * to the returned token. Using this token with `waitFor()`, we can guarantee
 * that `CountryStore` is updated before the callback that updates `CityStore`
 * needs to query its data.
 *
 *   CityStore.dispatchToken = flightDispatcher.register(function(payload) {
 *     if (payload.actionType === 'country-update') {
 *       // `CountryStore.country` may not be updated.
 *       flightDispatcher.waitFor([CountryStore.dispatchToken]);
 *       // `CountryStore.country` is now guaranteed to be updated.
 *
 *       // Select the default city for the new country
 *       CityStore.city = getDefaultCityForCountry(CountryStore.country);
 *     }
 *   });
 *
 * The usage of `waitFor()` can be chained, for example:
 *
 *   FlightPriceStore.dispatchToken =
 *     flightDispatcher.register(function(payload)) {
 *       switch (payload.actionType) {
 *         case 'country-update':
 *           flightDispatcher.waitFor([CityStore.dispatchToken]);
 *           FlightPriceStore.price =
 *             getFlightPriceStore(CountryStore.country, CityStore.city);
 *           break;
 *
 *         case 'city-update':
 *           FlightPriceStore.price =
 *             FlightPriceStore(CountryStore.country, CityStore.city);
 *           break;
 *     }
 *   });
 *
 * The `country-update` payload will be guaranteed to invoke the stores'
 * registered callbacks in order: `CountryStore`, `CityStore`, then
 * `FlightPriceStore`.
 */

  function Dispatcher() {"use strict";
    this.$Dispatcher_callbacks = {};
    this.$Dispatcher_isPending = {};
    this.$Dispatcher_isHandled = {};
    this.$Dispatcher_isDispatching = false;
    this.$Dispatcher_pendingPayload = null;
  }

  /**
   * Registers a callback to be invoked with every dispatched payload. Returns
   * a token that can be used with `waitFor()`.
   *
   * @param {function} callback
   * @return {string}
   */
  Dispatcher.prototype.register=function(callback) {"use strict";
    var id = _prefix + _lastID++;
    this.$Dispatcher_callbacks[id] = callback;
    return id;
  };

  /**
   * Removes a callback based on its token.
   *
   * @param {string} id
   */
  Dispatcher.prototype.unregister=function(id) {"use strict";
    invariant(
      this.$Dispatcher_callbacks[id],
      'Dispatcher.unregister(...): `%s` does not map to a registered callback.',
      id
    );
    delete this.$Dispatcher_callbacks[id];
  };

  /**
   * Waits for the callbacks specified to be invoked before continuing execution
   * of the current callback. This method should only be used by a callback in
   * response to a dispatched payload.
   *
   * @param {array<string>} ids
   */
  Dispatcher.prototype.waitFor=function(ids) {"use strict";
    invariant(
      this.$Dispatcher_isDispatching,
      'Dispatcher.waitFor(...): Must be invoked while dispatching.'
    );
    for (var ii = 0; ii < ids.length; ii++) {
      var id = ids[ii];
      if (this.$Dispatcher_isPending[id]) {
        invariant(
          this.$Dispatcher_isHandled[id],
          'Dispatcher.waitFor(...): Circular dependency detected while ' +
          'waiting for `%s`.',
          id
        );
        continue;
      }
      invariant(
        this.$Dispatcher_callbacks[id],
        'Dispatcher.waitFor(...): `%s` does not map to a registered callback.',
        id
      );
      this.$Dispatcher_invokeCallback(id);
    }
  };

  /**
   * Dispatches a payload to all registered callbacks.
   *
   * @param {object} payload
   */
  Dispatcher.prototype.dispatch=function(payload) {"use strict";
    invariant(
      !this.$Dispatcher_isDispatching,
      'Dispatch.dispatch(...): Cannot dispatch in the middle of a dispatch.'
    );
    this.$Dispatcher_startDispatching(payload);
    try {
      for (var id in this.$Dispatcher_callbacks) {
        if (this.$Dispatcher_isPending[id]) {
          continue;
        }
        this.$Dispatcher_invokeCallback(id);
      }
    } finally {
      this.$Dispatcher_stopDispatching();
    }
  };

  /**
   * Is this Dispatcher currently dispatching.
   *
   * @return {boolean}
   */
  Dispatcher.prototype.isDispatching=function() {"use strict";
    return this.$Dispatcher_isDispatching;
  };

  /**
   * Call the callback stored with the given id. Also do some internal
   * bookkeeping.
   *
   * @param {string} id
   * @internal
   */
  Dispatcher.prototype.$Dispatcher_invokeCallback=function(id) {"use strict";
    this.$Dispatcher_isPending[id] = true;
    this.$Dispatcher_callbacks[id](this.$Dispatcher_pendingPayload);
    this.$Dispatcher_isHandled[id] = true;
  };

  /**
   * Set up bookkeeping needed when dispatching.
   *
   * @param {object} payload
   * @internal
   */
  Dispatcher.prototype.$Dispatcher_startDispatching=function(payload) {"use strict";
    for (var id in this.$Dispatcher_callbacks) {
      this.$Dispatcher_isPending[id] = false;
      this.$Dispatcher_isHandled[id] = false;
    }
    this.$Dispatcher_pendingPayload = payload;
    this.$Dispatcher_isDispatching = true;
  };

  /**
   * Clear bookkeeping used for dispatching.
   *
   * @internal
   */
  Dispatcher.prototype.$Dispatcher_stopDispatching=function() {"use strict";
    this.$Dispatcher_pendingPayload = null;
    this.$Dispatcher_isDispatching = false;
  };


module.exports = Dispatcher;

},{"./invariant":18}],18:[function(require,module,exports){
/**
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule invariant
 */

"use strict";

/**
 * Use invariant() to assert state which your program assumes to be true.
 *
 * Provide sprintf-style format (only %s is supported) and arguments
 * to provide information about what broke and what you were
 * expecting.
 *
 * The invariant message will be stripped in production, but the invariant
 * will remain to ensure logic does not differ in production.
 */

var invariant = function(condition, format, a, b, c, d, e, f) {
  if (false) {
    if (format === undefined) {
      throw new Error('invariant requires an error message argument');
    }
  }

  if (!condition) {
    var error;
    if (format === undefined) {
      error = new Error(
        'Minified exception occurred; use the non-minified dev environment ' +
        'for the full error message and additional helpful warnings.'
      );
    } else {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      error = new Error(
        'Invariant Violation: ' +
        format.replace(/%s/g, function() { return args[argIndex++]; })
      );
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
};

module.exports = invariant;

},{}],19:[function(require,module,exports){
/**
 * @jsx React.DOM
 */ 

var ChatList = require('./components/ChatList.react.js');
var MovieCtrl = require('./components/Movie.js');


React.renderComponent(ChatList({scrollEle: "#msg-module .scroll-wrapper", scrollCtn: "#msg-module"}), $('#msg-module .list-ctn').get(0));


$('.simulate-video audio').on('play', function(){
    MovieCtrl.start();
    setTimeout(function(){
        $('#msg-module').removeClass('hidden');
    }, 2400);

    setTimeout(function(){
        $('.mask.curtain').removeClass('hidden');
        setTimeout(function(){
            $('.movie-title').removeClass('hidden');
        }, 2000);
    // before wardo: mark!!!
    },55350);

    // 隐藏掉控制条
    $(this).css('opacity', 0);
    var self = this;
    setTimeout(function(){
        $(self).removeAttr('controls');
    }, 1000);
    
});
},{"./components/ChatList.react.js":10,"./components/Movie.js":12}],20:[function(require,module,exports){



var EventEmitter = require('events').EventEmitter;
var merge = require('react/lib/merge');

var ChatDispatcher = require('../dispatcher/ChatDispatcher');
var ChatConstants = require('../constants/ChatConstants');

var CHANGE_EVENT = 'change';

var dialogData = require('../data/dialogData.js');
var userData = require('../data/userData.js');


var _data = {};

// _data = dialogData;

function getAll(){
    var arr = [];
    for( var i in _data ){
        arr.push( _data[i] )
    }
    return arr;
}

function createOne(id, obj){
    _data[id] = obj;
}

function updateOne(id, updates){
    _data[id] = merge(_data[id], updates);
}

var ChatStore = merge(EventEmitter.prototype, {
    getAll: getAll,
    emitChange: function(){
        this.emit(CHANGE_EVENT);
    },
    addChangeListener: function(callback){
        this.on(CHANGE_EVENT, callback)
    },
    removeChangeListener: function(callback){
        this.removeListener(CHANGE_EVENT, callback)
    }
});


ChatDispatcher.register(function(payload){
    var action = payload.action;

    switch(action.actionType){
        case ChatConstants.WORD_CREATE:
            createOne(action.id, action.word);
            break;
        case ChatConstants.WORD_UPDATE:
            updateOne(action.id, action.updates);
            break;
        default:
            // console.log('chat store do not handle this action', action);
            break;
    }

    ChatStore.emitChange();

    return true;
});


module.exports = ChatStore;
},{"../constants/ChatConstants":13,"../data/dialogData.js":14,"../data/userData.js":15,"../dispatcher/ChatDispatcher":16,"events":1,"react/lib/merge":6}]},{},[19])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jaGVubGxvcy9Eb2N1bWVudHMvZGV2L1JlYWN0Rmx1eC9rZmMvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvVXNlcnMvY2hlbmxsb3MvRG9jdW1lbnRzL2Rldi9SZWFjdEZsdXgva2ZjL25vZGVfbW9kdWxlcy9yZWFjdC9saWIvY29weVByb3BlcnRpZXMuanMiLCIvVXNlcnMvY2hlbmxsb3MvRG9jdW1lbnRzL2Rldi9SZWFjdEZsdXgva2ZjL25vZGVfbW9kdWxlcy9yZWFjdC9saWIvaW52YXJpYW50LmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy9ub2RlX21vZHVsZXMvcmVhY3QvbGliL2tleU1pcnJvci5qcyIsIi9Vc2Vycy9jaGVubGxvcy9Eb2N1bWVudHMvZGV2L1JlYWN0Rmx1eC9rZmMvbm9kZV9tb2R1bGVzL3JlYWN0L2xpYi9tZXJnZS5qcyIsIi9Vc2Vycy9jaGVubGxvcy9Eb2N1bWVudHMvZGV2L1JlYWN0Rmx1eC9rZmMvbm9kZV9tb2R1bGVzL3JlYWN0L2xpYi9tZXJnZUhlbHBlcnMuanMiLCIvVXNlcnMvY2hlbmxsb3MvRG9jdW1lbnRzL2Rldi9SZWFjdEZsdXgva2ZjL25vZGVfbW9kdWxlcy9yZWFjdC9saWIvbWVyZ2VJbnRvLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9hY3Rpb25zL01vdmllQWN0aW9uLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9jb21wb25lbnRzL0NoYXRMaXN0LnJlYWN0LmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9jb21wb25lbnRzL0NoYXRXb3JkLnJlYWN0LmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9jb21wb25lbnRzL01vdmllLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9jb25zdGFudHMvQ2hhdENvbnN0YW50cy5qcyIsIi9Vc2Vycy9jaGVubGxvcy9Eb2N1bWVudHMvZGV2L1JlYWN0Rmx1eC9rZmMvdmlkZW8vanMvZGF0YS9kaWFsb2dEYXRhLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9kYXRhL3VzZXJEYXRhLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9kaXNwYXRjaGVyL0NoYXREaXNwYXRjaGVyLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9kaXNwYXRjaGVyL0Rpc3BhdGNoZXIuanMiLCIvVXNlcnMvY2hlbmxsb3MvRG9jdW1lbnRzL2Rldi9SZWFjdEZsdXgva2ZjL3ZpZGVvL2pzL2Rpc3BhdGNoZXIvaW52YXJpYW50LmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9mYWtlXzUyMjE0NDNkLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9zdG9yZXMvQ2hhdFN0b3JlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbi8qKlxuICogQ29weXJpZ2h0IDIwMTMtMjAxNCBGYWNlYm9vaywgSW5jLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICpcbiAqIEBwcm92aWRlc01vZHVsZSBjb3B5UHJvcGVydGllc1xuICovXG5cbi8qKlxuICogQ29weSBwcm9wZXJ0aWVzIGZyb20gb25lIG9yIG1vcmUgb2JqZWN0cyAodXAgdG8gNSkgaW50byB0aGUgZmlyc3Qgb2JqZWN0LlxuICogVGhpcyBpcyBhIHNoYWxsb3cgY29weS4gSXQgbXV0YXRlcyB0aGUgZmlyc3Qgb2JqZWN0IGFuZCBhbHNvIHJldHVybnMgaXQuXG4gKlxuICogTk9URTogYGFyZ3VtZW50c2AgaGFzIGEgdmVyeSBzaWduaWZpY2FudCBwZXJmb3JtYW5jZSBwZW5hbHR5LCB3aGljaCBpcyB3aHlcbiAqIHdlIGRvbid0IHN1cHBvcnQgdW5saW1pdGVkIGFyZ3VtZW50cy5cbiAqL1xuZnVuY3Rpb24gY29weVByb3BlcnRpZXMob2JqLCBhLCBiLCBjLCBkLCBlLCBmKSB7XG4gIG9iaiA9IG9iaiB8fCB7fTtcblxuICBpZiAoXCJwcm9kdWN0aW9uXCIgIT09IHByb2Nlc3MuZW52Lk5PREVfRU5WKSB7XG4gICAgaWYgKGYpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVG9vIG1hbnkgYXJndW1lbnRzIHBhc3NlZCB0byBjb3B5UHJvcGVydGllcycpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBhcmdzID0gW2EsIGIsIGMsIGQsIGVdO1xuICB2YXIgaWkgPSAwLCB2O1xuICB3aGlsZSAoYXJnc1tpaV0pIHtcbiAgICB2ID0gYXJnc1tpaSsrXTtcbiAgICBmb3IgKHZhciBrIGluIHYpIHtcbiAgICAgIG9ialtrXSA9IHZba107XG4gICAgfVxuXG4gICAgLy8gSUUgaWdub3JlcyB0b1N0cmluZyBpbiBvYmplY3QgaXRlcmF0aW9uLi4gU2VlOlxuICAgIC8vIHdlYnJlZmxlY3Rpb24uYmxvZ3Nwb3QuY29tLzIwMDcvMDcvcXVpY2stZml4LWludGVybmV0LWV4cGxvcmVyLWFuZC5odG1sXG4gICAgaWYgKHYuaGFzT3duUHJvcGVydHkgJiYgdi5oYXNPd25Qcm9wZXJ0eSgndG9TdHJpbmcnKSAmJlxuICAgICAgICAodHlwZW9mIHYudG9TdHJpbmcgIT0gJ3VuZGVmaW5lZCcpICYmIChvYmoudG9TdHJpbmcgIT09IHYudG9TdHJpbmcpKSB7XG4gICAgICBvYmoudG9TdHJpbmcgPSB2LnRvU3RyaW5nO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvYmo7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY29weVByb3BlcnRpZXM7XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwib01mcEFuXCIpKSIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG4vKipcbiAqIENvcHlyaWdodCAyMDEzLTIwMTQgRmFjZWJvb2ssIEluYy5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqXG4gKiBAcHJvdmlkZXNNb2R1bGUgaW52YXJpYW50XG4gKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qKlxuICogVXNlIGludmFyaWFudCgpIHRvIGFzc2VydCBzdGF0ZSB3aGljaCB5b3VyIHByb2dyYW0gYXNzdW1lcyB0byBiZSB0cnVlLlxuICpcbiAqIFByb3ZpZGUgc3ByaW50Zi1zdHlsZSBmb3JtYXQgKG9ubHkgJXMgaXMgc3VwcG9ydGVkKSBhbmQgYXJndW1lbnRzXG4gKiB0byBwcm92aWRlIGluZm9ybWF0aW9uIGFib3V0IHdoYXQgYnJva2UgYW5kIHdoYXQgeW91IHdlcmVcbiAqIGV4cGVjdGluZy5cbiAqXG4gKiBUaGUgaW52YXJpYW50IG1lc3NhZ2Ugd2lsbCBiZSBzdHJpcHBlZCBpbiBwcm9kdWN0aW9uLCBidXQgdGhlIGludmFyaWFudFxuICogd2lsbCByZW1haW4gdG8gZW5zdXJlIGxvZ2ljIGRvZXMgbm90IGRpZmZlciBpbiBwcm9kdWN0aW9uLlxuICovXG5cbnZhciBpbnZhcmlhbnQgPSBmdW5jdGlvbihjb25kaXRpb24sIGZvcm1hdCwgYSwgYiwgYywgZCwgZSwgZikge1xuICBpZiAoXCJwcm9kdWN0aW9uXCIgIT09IHByb2Nlc3MuZW52Lk5PREVfRU5WKSB7XG4gICAgaWYgKGZvcm1hdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludmFyaWFudCByZXF1aXJlcyBhbiBlcnJvciBtZXNzYWdlIGFyZ3VtZW50Jyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFjb25kaXRpb24pIHtcbiAgICB2YXIgZXJyb3I7XG4gICAgaWYgKGZvcm1hdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBlcnJvciA9IG5ldyBFcnJvcihcbiAgICAgICAgJ01pbmlmaWVkIGV4Y2VwdGlvbiBvY2N1cnJlZDsgdXNlIHRoZSBub24tbWluaWZpZWQgZGV2IGVudmlyb25tZW50ICcgK1xuICAgICAgICAnZm9yIHRoZSBmdWxsIGVycm9yIG1lc3NhZ2UgYW5kIGFkZGl0aW9uYWwgaGVscGZ1bCB3YXJuaW5ncy4nXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYXJncyA9IFthLCBiLCBjLCBkLCBlLCBmXTtcbiAgICAgIHZhciBhcmdJbmRleCA9IDA7XG4gICAgICBlcnJvciA9IG5ldyBFcnJvcihcbiAgICAgICAgJ0ludmFyaWFudCBWaW9sYXRpb246ICcgK1xuICAgICAgICBmb3JtYXQucmVwbGFjZSgvJXMvZywgZnVuY3Rpb24oKSB7IHJldHVybiBhcmdzW2FyZ0luZGV4KytdOyB9KVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBlcnJvci5mcmFtZXNUb1BvcCA9IDE7IC8vIHdlIGRvbid0IGNhcmUgYWJvdXQgaW52YXJpYW50J3Mgb3duIGZyYW1lXG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gaW52YXJpYW50O1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSkiLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLyoqXG4gKiBDb3B5cmlnaHQgMjAxMy0yMDE0IEZhY2Vib29rLCBJbmMuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKlxuICogQHByb3ZpZGVzTW9kdWxlIGtleU1pcnJvclxuICogQHR5cGVjaGVja3Mgc3RhdGljLW9ubHlcbiAqL1xuXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIGludmFyaWFudCA9IHJlcXVpcmUoXCIuL2ludmFyaWFudFwiKTtcblxuLyoqXG4gKiBDb25zdHJ1Y3RzIGFuIGVudW1lcmF0aW9uIHdpdGgga2V5cyBlcXVhbCB0byB0aGVpciB2YWx1ZS5cbiAqXG4gKiBGb3IgZXhhbXBsZTpcbiAqXG4gKiAgIHZhciBDT0xPUlMgPSBrZXlNaXJyb3Ioe2JsdWU6IG51bGwsIHJlZDogbnVsbH0pO1xuICogICB2YXIgbXlDb2xvciA9IENPTE9SUy5ibHVlO1xuICogICB2YXIgaXNDb2xvclZhbGlkID0gISFDT0xPUlNbbXlDb2xvcl07XG4gKlxuICogVGhlIGxhc3QgbGluZSBjb3VsZCBub3QgYmUgcGVyZm9ybWVkIGlmIHRoZSB2YWx1ZXMgb2YgdGhlIGdlbmVyYXRlZCBlbnVtIHdlcmVcbiAqIG5vdCBlcXVhbCB0byB0aGVpciBrZXlzLlxuICpcbiAqICAgSW5wdXQ6ICB7a2V5MTogdmFsMSwga2V5MjogdmFsMn1cbiAqICAgT3V0cHV0OiB7a2V5MToga2V5MSwga2V5Mjoga2V5Mn1cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtvYmplY3R9XG4gKi9cbnZhciBrZXlNaXJyb3IgPSBmdW5jdGlvbihvYmopIHtcbiAgdmFyIHJldCA9IHt9O1xuICB2YXIga2V5O1xuICAoXCJwcm9kdWN0aW9uXCIgIT09IHByb2Nlc3MuZW52Lk5PREVfRU5WID8gaW52YXJpYW50KFxuICAgIG9iaiBpbnN0YW5jZW9mIE9iamVjdCAmJiAhQXJyYXkuaXNBcnJheShvYmopLFxuICAgICdrZXlNaXJyb3IoLi4uKTogQXJndW1lbnQgbXVzdCBiZSBhbiBvYmplY3QuJ1xuICApIDogaW52YXJpYW50KG9iaiBpbnN0YW5jZW9mIE9iamVjdCAmJiAhQXJyYXkuaXNBcnJheShvYmopKSk7XG4gIGZvciAoa2V5IGluIG9iaikge1xuICAgIGlmICghb2JqLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICByZXRba2V5XSA9IGtleTtcbiAgfVxuICByZXR1cm4gcmV0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBrZXlNaXJyb3I7XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwib01mcEFuXCIpKSIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTMtMjAxNCBGYWNlYm9vaywgSW5jLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICpcbiAqIEBwcm92aWRlc01vZHVsZSBtZXJnZVxuICovXG5cblwidXNlIHN0cmljdFwiO1xuXG52YXIgbWVyZ2VJbnRvID0gcmVxdWlyZShcIi4vbWVyZ2VJbnRvXCIpO1xuXG4vKipcbiAqIFNoYWxsb3cgbWVyZ2VzIHR3byBzdHJ1Y3R1cmVzIGludG8gYSByZXR1cm4gdmFsdWUsIHdpdGhvdXQgbXV0YXRpbmcgZWl0aGVyLlxuICpcbiAqIEBwYXJhbSB7P29iamVjdH0gb25lIE9wdGlvbmFsIG9iamVjdCB3aXRoIHByb3BlcnRpZXMgdG8gbWVyZ2UgZnJvbS5cbiAqIEBwYXJhbSB7P29iamVjdH0gdHdvIE9wdGlvbmFsIG9iamVjdCB3aXRoIHByb3BlcnRpZXMgdG8gbWVyZ2UgZnJvbS5cbiAqIEByZXR1cm4ge29iamVjdH0gVGhlIHNoYWxsb3cgZXh0ZW5zaW9uIG9mIG9uZSBieSB0d28uXG4gKi9cbnZhciBtZXJnZSA9IGZ1bmN0aW9uKG9uZSwgdHdvKSB7XG4gIHZhciByZXN1bHQgPSB7fTtcbiAgbWVyZ2VJbnRvKHJlc3VsdCwgb25lKTtcbiAgbWVyZ2VJbnRvKHJlc3VsdCwgdHdvKTtcbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbWVyZ2U7XG4iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLyoqXG4gKiBDb3B5cmlnaHQgMjAxMy0yMDE0IEZhY2Vib29rLCBJbmMuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKlxuICogQHByb3ZpZGVzTW9kdWxlIG1lcmdlSGVscGVyc1xuICpcbiAqIHJlcXVpcmVzUG9seWZpbGxzOiBBcnJheS5pc0FycmF5XG4gKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBpbnZhcmlhbnQgPSByZXF1aXJlKFwiLi9pbnZhcmlhbnRcIik7XG52YXIga2V5TWlycm9yID0gcmVxdWlyZShcIi4va2V5TWlycm9yXCIpO1xuXG4vKipcbiAqIE1heGltdW0gbnVtYmVyIG9mIGxldmVscyB0byB0cmF2ZXJzZS4gV2lsbCBjYXRjaCBjaXJjdWxhciBzdHJ1Y3R1cmVzLlxuICogQGNvbnN0XG4gKi9cbnZhciBNQVhfTUVSR0VfREVQVEggPSAzNjtcblxuLyoqXG4gKiBXZSB3b24ndCB3b3JyeSBhYm91dCBlZGdlIGNhc2VzIGxpa2UgbmV3IFN0cmluZygneCcpIG9yIG5ldyBCb29sZWFuKHRydWUpLlxuICogRnVuY3Rpb25zIGFyZSBjb25zaWRlcmVkIHRlcm1pbmFscywgYW5kIGFycmF5cyBhcmUgbm90LlxuICogQHBhcmFtIHsqfSBvIFRoZSBpdGVtL29iamVjdC92YWx1ZSB0byB0ZXN0LlxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZmYgdGhlIGFyZ3VtZW50IGlzIGEgdGVybWluYWwuXG4gKi9cbnZhciBpc1Rlcm1pbmFsID0gZnVuY3Rpb24obykge1xuICByZXR1cm4gdHlwZW9mIG8gIT09ICdvYmplY3QnIHx8IG8gPT09IG51bGw7XG59O1xuXG52YXIgbWVyZ2VIZWxwZXJzID0ge1xuXG4gIE1BWF9NRVJHRV9ERVBUSDogTUFYX01FUkdFX0RFUFRILFxuXG4gIGlzVGVybWluYWw6IGlzVGVybWluYWwsXG5cbiAgLyoqXG4gICAqIENvbnZlcnRzIG51bGwvdW5kZWZpbmVkIHZhbHVlcyBpbnRvIGVtcHR5IG9iamVjdC5cbiAgICpcbiAgICogQHBhcmFtIHs/T2JqZWN0PX0gYXJnIEFyZ3VtZW50IHRvIGJlIG5vcm1hbGl6ZWQgKG51bGxhYmxlIG9wdGlvbmFsKVxuICAgKiBAcmV0dXJuIHshT2JqZWN0fVxuICAgKi9cbiAgbm9ybWFsaXplTWVyZ2VBcmc6IGZ1bmN0aW9uKGFyZykge1xuICAgIHJldHVybiBhcmcgPT09IHVuZGVmaW5lZCB8fCBhcmcgPT09IG51bGwgPyB7fSA6IGFyZztcbiAgfSxcblxuICAvKipcbiAgICogSWYgbWVyZ2luZyBBcnJheXMsIGEgbWVyZ2Ugc3RyYXRlZ3kgKm11c3QqIGJlIHN1cHBsaWVkLiBJZiBub3QsIGl0IGlzXG4gICAqIGxpa2VseSB0aGUgY2FsbGVyJ3MgZmF1bHQuIElmIHRoaXMgZnVuY3Rpb24gaXMgZXZlciBjYWxsZWQgd2l0aCBhbnl0aGluZ1xuICAgKiBidXQgYG9uZWAgYW5kIGB0d29gIGJlaW5nIGBBcnJheWBzLCBpdCBpcyB0aGUgZmF1bHQgb2YgdGhlIG1lcmdlIHV0aWxpdGllcy5cbiAgICpcbiAgICogQHBhcmFtIHsqfSBvbmUgQXJyYXkgdG8gbWVyZ2UgaW50by5cbiAgICogQHBhcmFtIHsqfSB0d28gQXJyYXkgdG8gbWVyZ2UgZnJvbS5cbiAgICovXG4gIGNoZWNrTWVyZ2VBcnJheUFyZ3M6IGZ1bmN0aW9uKG9uZSwgdHdvKSB7XG4gICAgKFwicHJvZHVjdGlvblwiICE9PSBwcm9jZXNzLmVudi5OT0RFX0VOViA/IGludmFyaWFudChcbiAgICAgIEFycmF5LmlzQXJyYXkob25lKSAmJiBBcnJheS5pc0FycmF5KHR3byksXG4gICAgICAnVHJpZWQgdG8gbWVyZ2UgYXJyYXlzLCBpbnN0ZWFkIGdvdCAlcyBhbmQgJXMuJyxcbiAgICAgIG9uZSxcbiAgICAgIHR3b1xuICAgICkgOiBpbnZhcmlhbnQoQXJyYXkuaXNBcnJheShvbmUpICYmIEFycmF5LmlzQXJyYXkodHdvKSkpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAcGFyYW0geyp9IG9uZSBPYmplY3QgdG8gbWVyZ2UgaW50by5cbiAgICogQHBhcmFtIHsqfSB0d28gT2JqZWN0IHRvIG1lcmdlIGZyb20uXG4gICAqL1xuICBjaGVja01lcmdlT2JqZWN0QXJnczogZnVuY3Rpb24ob25lLCB0d28pIHtcbiAgICBtZXJnZUhlbHBlcnMuY2hlY2tNZXJnZU9iamVjdEFyZyhvbmUpO1xuICAgIG1lcmdlSGVscGVycy5jaGVja01lcmdlT2JqZWN0QXJnKHR3byk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7Kn0gYXJnXG4gICAqL1xuICBjaGVja01lcmdlT2JqZWN0QXJnOiBmdW5jdGlvbihhcmcpIHtcbiAgICAoXCJwcm9kdWN0aW9uXCIgIT09IHByb2Nlc3MuZW52Lk5PREVfRU5WID8gaW52YXJpYW50KFxuICAgICAgIWlzVGVybWluYWwoYXJnKSAmJiAhQXJyYXkuaXNBcnJheShhcmcpLFxuICAgICAgJ1RyaWVkIHRvIG1lcmdlIGFuIG9iamVjdCwgaW5zdGVhZCBnb3QgJXMuJyxcbiAgICAgIGFyZ1xuICAgICkgOiBpbnZhcmlhbnQoIWlzVGVybWluYWwoYXJnKSAmJiAhQXJyYXkuaXNBcnJheShhcmcpKSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7Kn0gYXJnXG4gICAqL1xuICBjaGVja01lcmdlSW50b09iamVjdEFyZzogZnVuY3Rpb24oYXJnKSB7XG4gICAgKFwicHJvZHVjdGlvblwiICE9PSBwcm9jZXNzLmVudi5OT0RFX0VOViA/IGludmFyaWFudChcbiAgICAgICghaXNUZXJtaW5hbChhcmcpIHx8IHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbicpICYmICFBcnJheS5pc0FycmF5KGFyZyksXG4gICAgICAnVHJpZWQgdG8gbWVyZ2UgaW50byBhbiBvYmplY3QsIGluc3RlYWQgZ290ICVzLicsXG4gICAgICBhcmdcbiAgICApIDogaW52YXJpYW50KCghaXNUZXJtaW5hbChhcmcpIHx8IHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbicpICYmICFBcnJheS5pc0FycmF5KGFyZykpKTtcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2tzIHRoYXQgYSBtZXJnZSB3YXMgbm90IGdpdmVuIGEgY2lyY3VsYXIgb2JqZWN0IG9yIGFuIG9iamVjdCB0aGF0IGhhZFxuICAgKiB0b28gZ3JlYXQgb2YgZGVwdGguXG4gICAqXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBMZXZlbCBvZiByZWN1cnNpb24gdG8gdmFsaWRhdGUgYWdhaW5zdCBtYXhpbXVtLlxuICAgKi9cbiAgY2hlY2tNZXJnZUxldmVsOiBmdW5jdGlvbihsZXZlbCkge1xuICAgIChcInByb2R1Y3Rpb25cIiAhPT0gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPyBpbnZhcmlhbnQoXG4gICAgICBsZXZlbCA8IE1BWF9NRVJHRV9ERVBUSCxcbiAgICAgICdNYXhpbXVtIGRlZXAgbWVyZ2UgZGVwdGggZXhjZWVkZWQuIFlvdSBtYXkgYmUgYXR0ZW1wdGluZyB0byBtZXJnZSAnICtcbiAgICAgICdjaXJjdWxhciBzdHJ1Y3R1cmVzIGluIGFuIHVuc3VwcG9ydGVkIHdheS4nXG4gICAgKSA6IGludmFyaWFudChsZXZlbCA8IE1BWF9NRVJHRV9ERVBUSCkpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDaGVja3MgdGhhdCB0aGUgc3VwcGxpZWQgbWVyZ2Ugc3RyYXRlZ3kgaXMgdmFsaWQuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBBcnJheSBtZXJnZSBzdHJhdGVneS5cbiAgICovXG4gIGNoZWNrQXJyYXlTdHJhdGVneTogZnVuY3Rpb24oc3RyYXRlZ3kpIHtcbiAgICAoXCJwcm9kdWN0aW9uXCIgIT09IHByb2Nlc3MuZW52Lk5PREVfRU5WID8gaW52YXJpYW50KFxuICAgICAgc3RyYXRlZ3kgPT09IHVuZGVmaW5lZCB8fCBzdHJhdGVneSBpbiBtZXJnZUhlbHBlcnMuQXJyYXlTdHJhdGVnaWVzLFxuICAgICAgJ1lvdSBtdXN0IHByb3ZpZGUgYW4gYXJyYXkgc3RyYXRlZ3kgdG8gZGVlcCBtZXJnZSBmdW5jdGlvbnMgdG8gJyArXG4gICAgICAnaW5zdHJ1Y3QgdGhlIGRlZXAgbWVyZ2UgaG93IHRvIHJlc29sdmUgbWVyZ2luZyB0d28gYXJyYXlzLidcbiAgICApIDogaW52YXJpYW50KHN0cmF0ZWd5ID09PSB1bmRlZmluZWQgfHwgc3RyYXRlZ3kgaW4gbWVyZ2VIZWxwZXJzLkFycmF5U3RyYXRlZ2llcykpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXQgb2YgcG9zc2libGUgYmVoYXZpb3JzIG9mIG1lcmdlIGFsZ29yaXRobXMgd2hlbiBlbmNvdW50ZXJpbmcgdHdvIEFycmF5c1xuICAgKiB0aGF0IG11c3QgYmUgbWVyZ2VkIHRvZ2V0aGVyLlxuICAgKiAtIGBjbG9iYmVyYDogVGhlIGxlZnQgYEFycmF5YCBpcyBpZ25vcmVkLlxuICAgKiAtIGBpbmRleEJ5SW5kZXhgOiBUaGUgcmVzdWx0IGlzIGFjaGlldmVkIGJ5IHJlY3Vyc2l2ZWx5IGRlZXAgbWVyZ2luZyBhdFxuICAgKiAgIGVhY2ggaW5kZXguIChub3QgeWV0IHN1cHBvcnRlZC4pXG4gICAqL1xuICBBcnJheVN0cmF0ZWdpZXM6IGtleU1pcnJvcih7XG4gICAgQ2xvYmJlcjogdHJ1ZSxcbiAgICBJbmRleEJ5SW5kZXg6IHRydWVcbiAgfSlcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBtZXJnZUhlbHBlcnM7XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwib01mcEFuXCIpKSIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTMtMjAxNCBGYWNlYm9vaywgSW5jLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICpcbiAqIEBwcm92aWRlc01vZHVsZSBtZXJnZUludG9cbiAqIEB0eXBlY2hlY2tzIHN0YXRpYy1vbmx5XG4gKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBtZXJnZUhlbHBlcnMgPSByZXF1aXJlKFwiLi9tZXJnZUhlbHBlcnNcIik7XG5cbnZhciBjaGVja01lcmdlT2JqZWN0QXJnID0gbWVyZ2VIZWxwZXJzLmNoZWNrTWVyZ2VPYmplY3RBcmc7XG52YXIgY2hlY2tNZXJnZUludG9PYmplY3RBcmcgPSBtZXJnZUhlbHBlcnMuY2hlY2tNZXJnZUludG9PYmplY3RBcmc7XG5cbi8qKlxuICogU2hhbGxvdyBtZXJnZXMgdHdvIHN0cnVjdHVyZXMgYnkgbXV0YXRpbmcgdGhlIGZpcnN0IHBhcmFtZXRlci5cbiAqXG4gKiBAcGFyYW0ge29iamVjdHxmdW5jdGlvbn0gb25lIE9iamVjdCB0byBiZSBtZXJnZWQgaW50by5cbiAqIEBwYXJhbSB7P29iamVjdH0gdHdvIE9wdGlvbmFsIG9iamVjdCB3aXRoIHByb3BlcnRpZXMgdG8gbWVyZ2UgZnJvbS5cbiAqL1xuZnVuY3Rpb24gbWVyZ2VJbnRvKG9uZSwgdHdvKSB7XG4gIGNoZWNrTWVyZ2VJbnRvT2JqZWN0QXJnKG9uZSk7XG4gIGlmICh0d28gIT0gbnVsbCkge1xuICAgIGNoZWNrTWVyZ2VPYmplY3RBcmcodHdvKTtcbiAgICBmb3IgKHZhciBrZXkgaW4gdHdvKSB7XG4gICAgICBpZiAoIXR3by5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgb25lW2tleV0gPSB0d29ba2V5XTtcbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBtZXJnZUludG87XG4iLCJcbi8vIOWjsOaYjuaJgOacieeahGFjdGlvblxuLy8g55Sx5ZOq5LiqZGlzcGF0Y2hlcui0n+i0o+WIhuWPkVxuLy8g5YiG5Y+R55qEcGF5bG9hZOS4reeahGFjdGlvblR5cGXmmK/ku4DkuYhcbi8vIOi/meS4qmFjdGlvbuaJgOmcgOimgeeahOWPguaVsCwg5o6l5pS25bm25Lyg57uZ5YiG5Y+R5ZmoXG5cbnZhciBDaGF0RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4uL2Rpc3BhdGNoZXIvQ2hhdERpc3BhdGNoZXInKTtcbnZhciBDaGF0Q29uc3RhbnRzID0gcmVxdWlyZSgnLi4vY29uc3RhbnRzL0NoYXRDb25zdGFudHMnKTtcblxudmFyIE1vdmllQWN0aW9ucyA9IHtcbiAgICAvLyBzdGFydCB0aW1lIGFzIGlkXG4gICAgY3JlYXRlOiBmdW5jdGlvbih3b3JkLCBpZCl7XG4gICAgICAgIENoYXREaXNwYXRjaGVyLmhhbmRsZU1vdmllQWN0aW9uKHtcbiAgICAgICAgICAgIGFjdGlvblR5cGU6IENoYXRDb25zdGFudHMuV09SRF9DUkVBVEUsXG4gICAgICAgICAgICB3b3JkOiB3b3JkLFxuICAgICAgICAgICAgaWQ6IGlkXG4gICAgICAgIH0pXG4gICAgfSxcbiAgICB1cGRhdGU6IGZ1bmN0aW9uKGlkLCB1cGRhdGVzKXtcbiAgICAgICAgQ2hhdERpc3BhdGNoZXIuaGFuZGxlTW92aWVBY3Rpb24oe1xuICAgICAgICAgICAgYWN0aW9uVHlwZTogQ2hhdENvbnN0YW50cy5XT1JEX1VQREFURSxcbiAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgIHVwZGF0ZXM6IHVwZGF0ZXNcbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IE1vdmllQWN0aW9ucztcblxuIiwiLyoqXG4gKiBAanN4IFJlYWN0LkRPTVxuICovIFxuXG5cblxudmFyIENoYXRTdG9yZSA9IHJlcXVpcmUoJy4uL3N0b3Jlcy9DaGF0U3RvcmUuanMnKVxuXG52YXIgQ2hhdFdvcmQgPSByZXF1aXJlKCcuL0NoYXRXb3JkLnJlYWN0LmpzJyk7XG5cbmZ1bmN0aW9uIGdldEFsbERhdGEoKXtcbiAgICByZXR1cm4ge1xuICAgICAgICBsaXN0OiBDaGF0U3RvcmUuZ2V0QWxsKClcbiAgICB9O1xufTtcblxudmFyIHNjb2xsRWxlID0gbnVsbCwgbGFzdFNjcm9sbEhlaWdodCA9IDA7XG52YXIgc2Nyb2xsQ3RuID0gbnVsbCwgY3RuSGVpZ2h0ID0gMDtcbmZ1bmN0aW9uIGNoZWNrQW5kU2Nyb2xsKCl7XG4gICAgdmFyIG5ld0ggPSBzY3JvbGxDdG4uc2Nyb2xsSGVpZ2h0O1xuICAgIGlmKCBuZXdIID4gbGFzdFNjcm9sbEhlaWdodCApe1xuICAgICAgICBzY29sbEVsZS5jc3Moe1xuICAgICAgICAgICAgJy13ZWJraXQtdHJhbnNmb3JtJzogJ3RyYW5zbGF0ZVkoLScrIChuZXdIIC0gY3RuSGVpZ2h0KSsncHgpJyxcbiAgICAgICAgICAgICctbW96LXRyYW5zZm9ybSc6ICd0cmFuc2xhdGVZKC0nKyAobmV3SCAtIGN0bkhlaWdodCkrJ3B4KScsXG4gICAgICAgICAgICAndHJhbnNmb3JtJzogJ3RyYW5zbGF0ZVkoLScrIChuZXdIIC0gY3RuSGVpZ2h0KSsncHgpJ1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coIG5ld0ggLSBjdG5IZWlnaHQgKTtcbiAgICAgICAgbGFzdFNjcm9sbEhlaWdodCA9IG5ld0g7XG4gICAgfVxufVxuXG5cbnZhciBSZWFjdENTU1RyYW5zaXRpb25Hcm91cCA9IFJlYWN0LmFkZG9ucy5DU1NUcmFuc2l0aW9uR3JvdXA7XG5cbnZhciBDaGF0TGlzdCA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtkaXNwbGF5TmFtZTogJ0NoYXRMaXN0JyxcbiAgICBnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiBnZXRBbGxEYXRhKCk7XG4gICAgfSxcbiAgICBjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIOWIneWni+WMlua2iOaBr+a7muWKqFxuICAgICAgICBzY29sbEVsZSA9ICQodGhpcy5wcm9wcy5zY3JvbGxFbGUpO1xuICAgICAgICBzY3JvbGxDdG4gPSAkKHRoaXMucHJvcHMuc2Nyb2xsQ3RuKS5nZXQoMCk7XG4gICAgICAgIGN0bkhlaWdodCA9ICQoc2Nyb2xsQ3RuKS5oZWlnaHQoKTtcbiAgICAgICAgY2hlY2tBbmRTY3JvbGwoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIOa3u+WKoGNoYW5nZeebkeWQrFxuICAgICAgICBDaGF0U3RvcmUuYWRkQ2hhbmdlTGlzdGVuZXIoIHRoaXMuX29uQ2hhbmdlICk7XG4gICAgfSxcbiAgICBjb21wb25lbnREaWRVcGRhdGU6IGZ1bmN0aW9uKCl7XG4gICAgICAgIGNoZWNrQW5kU2Nyb2xsKCk7XG4gICAgfSxcbiAgICBjb21wb25lbnRXaWxsTW91bnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBDaGF0U3RvcmUucmVtb3ZlQ2hhbmdlTGlzdGVuZXIoIHRoaXMuX29uQ2hhbmdlICk7XG4gICAgfSxcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBub2RlcyA9IHRoaXMuc3RhdGUubGlzdC5tYXAoZnVuY3Rpb24oaXRlbSwgaSl7XG4gICAgICAgICAgICByZXR1cm4gQ2hhdFdvcmQoe2l0ZW06IGl0ZW0sIGtleTogaX0pO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgUmVhY3QuRE9NLnVsKHtpZDogXCJtc2ctbGlzdFwifSwgXG4gICAgICAgICAgICAgICAgUmVhY3RDU1NUcmFuc2l0aW9uR3JvdXAoe3RyYW5zaXRpb25OYW1lOiBcIm1zZy1pdGVtXCJ9LCBcbiAgICAgICAgICAgICAgICAgICAgbm9kZXNcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICApXG4gICAgICAgICk7XG4gICAgfSxcbiAgICBfb25DaGFuZ2U6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoIGdldEFsbERhdGEoKSApXG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2hhdExpc3Q7IiwiLyoqXG4gKiBAanN4IFJlYWN0LkRPTVxuICovIFxuXG4gZnVuY3Rpb24gYnVpbGRNc2dJdGVtKG1zZyl7XG4gICAgcmV0dXJuIChcbiAgICAgICAgUmVhY3QuRE9NLmxpKHtjbGFzc05hbWU6IFwibXNnLWl0ZW1cIn0sIFxuICAgICAgICAgICAgUmVhY3QuRE9NLmltZyh7c3JjOiBtc2cuYXZhdGFyLCBjbGFzc05hbWU6IFwiYXZhdGFyXCJ9KSwgXG4gICAgICAgICAgICBSZWFjdC5ET00uZGl2KHtjbGFzc05hbWU6IFwibXNnLWNvbnRlbnRcIn0sIFxuICAgICAgICAgICAgICAgIFJlYWN0LkRPTS5zcGFuKHtjbGFzc05hbWU6IFwibXNnLXVzZXItbmFtZVwifSwgbXNnLmFsaWFzKSwgXG4gICAgICAgICAgICAgICAgUmVhY3QuRE9NLnNwYW4oe2NsYXNzTmFtZTogXCJtc2ctdGV4dFwifSwgbXNnLndvcmQpXG4gICAgICAgICAgICApXG4gICAgICAgIClcbiAgICAgICAgKTtcbiAgICAvLyByZXR1cm4gKFxuICAgIC8vICAgICA8bGkgY2xhc3NOYW1lPVwibXNnLWl0ZW1cIj5cbiAgICAvLyAgICAgICAgIDxpbWcgc3JjPXsnLi9pbWcvYXZhdGFyLycrbXNnLnVzZXIrJy5wbmcnfSBjbGFzc05hbWU9XCJhdmF0YXJcIiAvPlxuICAgIC8vICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtc2ctY29udGVudFwiPlxuICAgIC8vICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cIm1zZy11c2VyLW5hbWVcIj57bXNnLnVzZXJ9PC9zcGFuPlxuICAgIC8vICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cIm1zZy10ZXh0XCI+e21zZy53b3JkfTwvc3Bhbj5cbiAgICAvLyAgICAgICAgIDwvZGl2PlxuICAgIC8vICAgICA8L2xpPlxuICAgIC8vICAgICApO1xuIH1cblxuXG52YXIgQ2hhdFdvcmQgPSBSZWFjdC5jcmVhdGVDbGFzcyh7ZGlzcGxheU5hbWU6ICdDaGF0V29yZCcsXG4gICAgZ2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4ge307XG4gICAgfSxcbiAgICBjb21wb25lbnREaWRVcGRhdGU6IGZ1bmN0aW9uKCl7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHRoaXMucHJvcHMuaXRlbS53b3JkKTtcbiAgICB9LFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIGJ1aWxkTXNnSXRlbSh0aGlzLnByb3BzLml0ZW0pO1xuICAgIH1cbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gQ2hhdFdvcmQ7IiwiXG5cbnZhciBNb3ZpZUFjdGlvbiA9IHJlcXVpcmUoJy4uL2FjdGlvbnMvTW92aWVBY3Rpb24uanMnKTtcbnZhciBkaWFsb2dEYXRhID0gcmVxdWlyZSgnLi4vZGF0YS9kaWFsb2dEYXRhLmpzJyk7XG52YXIgdXNlckRhdGEgPSByZXF1aXJlKCcuLi9kYXRhL3VzZXJEYXRhLmpzJyk7XG4vLyBzb3VyY2UgZGF0YTogZGlhbG9nXG5cbmZ1bmN0aW9uIGdldFVzZXJJbmZvKGlkZW50aWZlcil7XG4gICAgcmV0dXJuIHVzZXJEYXRhW2lkZW50aWZlcl07XG59XG5cbi8vIHN0cmluZyB3b3JkLCBkdXJhdGlvbiBvZiBtcywgb2Zmc2V0IG9mIG1zXG5mdW5jdGlvbiB0eXBlV29yZHMod29yZCwgZHVyLCBvZmZTZXQsIGNhbGxiYWNrKXtcbiAgICBpZighb2ZmU2V0KXtcbiAgICAgICAgb2ZmU2V0ID0gMDtcbiAgICB9XG4gICAgdmFyIGFyciA9IHdvcmQuc3BsaXQoJycpO1xuXG4gICAgYXJyLmZvckVhY2goZnVuY3Rpb24oZWwsIGkpe1xuICAgICAgICBjYWxsYmFjayggd29yZC5zdWJzdHIoMCwgMSkgKTtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgY2FsbGJhY2sod29yZC5zdWJzdHIoMCwgaSsxKSk7XG4gICAgICAgIH0sIChkdXIqKGkrMSkvYXJyLmxlbmd0aCkgKyBvZmZTZXQpO1xuICAgIH0pO1xufVxuXG5cbnZhciBNb3ZpZUN0cmwgPSB7XG4gICAgc3RhcnQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgIC8vIHNldFRpbWVvdXQgYW5kIHNlbmQgYWN0aW9uLi4uXG4gICAgICAgIGZvciggdmFyIGkgaW4gZGlhbG9nRGF0YSApe1xuICAgICAgICAgICAgKGZ1bmN0aW9uKGtleSl7XG4gICAgICAgICAgICAgICAgdmFyIHRpbWVvdXQgPSBrZXk7XG4gICAgICAgICAgICAgICAgdmFyIGlkID0ga2V5O1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGl0ZW0gPSBkaWFsb2dEYXRhW2tleV07XG4gICAgICAgICAgICAgICAgICAgIHZhciB1c2VySW5mbyA9IGdldFVzZXJJbmZvKGl0ZW0udXNlcik7XG4gICAgICAgICAgICAgICAgICAgIE1vdmllQWN0aW9uLmNyZWF0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbGlhczogdXNlckluZm8uYWxpYXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBhdmF0YXI6ICdpbWcvYXZhdGFyLycrdXNlckluZm8uYXZhdGFyLFxuICAgICAgICAgICAgICAgICAgICAgICAgd29yZDogJydcbiAgICAgICAgICAgICAgICAgICAgfSwgaWQpO1xuXG4gICAgICAgICAgICAgICAgICAgIChmdW5jdGlvbihzdHIsIGR1ciwgb2Zmc2V0KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkaWFJRCA9IG9mZnNldDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVXb3JkcyhzdHIsIGR1ciwgMCwgZnVuY3Rpb24ocGFydGlhbCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTW92aWVBY3Rpb24udXBkYXRlKCBkaWFJRCwge3dvcmQ6IHBhcnRpYWx9ICk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSkoaXRlbS53b3JkLCBpdGVtLmR1ciwgTnVtYmVyKHRpbWVvdXQpKTtcblxuICAgICAgICAgICAgICAgIH0sdGltZW91dCk7XG4gICAgICAgICAgICB9KShpKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTW92aWVDdHJsOyIsInZhciBrZXlNaXJyb3IgPSByZXF1aXJlKCdyZWFjdC9saWIva2V5TWlycm9yJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ga2V5TWlycm9yKHtcbiAgICBXT1JEX0NSRUFURTogbnVsbCxcbiAgICBXT1JEX1VQREFURTogbnVsbFxufSk7IiwidmFyIGRhdGEgPSB7XG4gICAgMjI0Nzoge1xuICAgICAgICB1c2VyOiAnbWFyaycsXG4gICAgICAgIHdvcmQ6ICdJIHRoaW5rIElcXCd2ZSBjb21lIHVwIHdpdGggc29tZXRoaW5nLi4uJyxcbiAgICAgICAgZHVyOiAzNTYxIC0gMjM0N1xuICAgIH0sXG4gICAgMzY0MDoge1xuICAgICAgICB1c2VyOiAnd2FyZG8nLFxuICAgICAgICB3b3JkOiAndGhhdCBsb29rcyBnb29kLiBUaGF0IGxvb2tzIHJlYWxseSBnb29kLicsXG4gICAgICAgIGR1cjogNTI4NSAtIDM2NDBcbiAgICB9LFxuICAgIDU0MjA6IHtcbiAgICAgICAgdXNlcjogJ21hcmsnLFxuICAgICAgICB3b3JkOiAnSXRcXCdzIGdvbm5hIGJlIG9ubGluZSBhbnkgc2Vjb25kLicsXG4gICAgICAgIGR1cjogIDY1NzAgLSA1NDIwXG4gICAgfSxcbiAgICA2NjUwOiB7XG4gICAgICAgIHVzZXI6ICdkdXN0aW4nLFxuICAgICAgICB3b3JkOiAnV2hvIHNob3VsZCB3ZSBzZW5kIGl0IHRvIGZpcnN0PycsXG4gICAgICAgIGR1cjogNzQ5MSAtIDY2NTBcbiAgICB9LFxuICAgIDc2OTA6IHtcbiAgICAgICAgdXNlcjogJ21hcmsnLFxuICAgICAgICB3b3JkOiAnSnVzdCBhIGNvdXBsZSBvZiBwZW9wbGUuLi4gVGhlIHF1ZXN0aW9uIGlzLi4uIHdobyBhcmUgdGhleSBnb25uYSBzZW5kIGl0IHRvPycsXG4gICAgICAgIGR1cjogMTAyMjMgLSA3NjkwXG4gICAgfSxcbiAgICAxMDMyNToge1xuICAgICAgICB1c2VyOiAnbWFyeScsXG4gICAgICAgIHdvcmQ6ICdUaGUgc2l0ZSBnb3QgMiwyMDAgaGl0cyB3aXRoaW4gdHdvIGhvdXJzPz8/JyxcbiAgICAgICAgZHVyOiAxMjk1MiAtIDEwMzI1XG4gICAgfSxcbiAgICAxMzA1Mzoge1xuICAgICAgICB1c2VyOiAnbWFyaycsXG4gICAgICAgIHdvcmQ6ICdUSE9VU0FORC4uLiAyMiwwMDAuJyxcbiAgICAgICAgZHVyOiAxNDU3NiAtIDEzMDUzXG4gICAgfSxcbiAgICAxNDYwMDoge1xuICAgICAgICB1c2VyOiAnbWFyeScsXG4gICAgICAgIHdvcmQ6ICdXT1chJyxcbiAgICAgICAgZHVyOiAxNDcwMCAtIDE0NjAwXG4gICAgfSxcbiAgICAxNDkwMDoge1xuICAgICAgICB1c2VyOiAnZXJpY2EnLFxuICAgICAgICB3b3JkOiAnWW91IGNhbGxlZCBtZSBhIEJJVENIIG9uIHRoZSBJbnRlcm5ldC4nLFxuICAgICAgICBkdXI6IDE2MjgwIC0gMTQ5MDBcbiAgICB9LFxuICAgIDE2MzkwOiB7XG4gICAgICAgIHVzZXI6ICdtYXJrJyxcbiAgICAgICAgd29yZDogJ0RvZXNuXFwndCBhbnlib2R5IGhhdmUgYSBzZW5zZSBvZiBodW1vcj8nLFxuICAgICAgICBkdXI6IDE3MzA2IC0gMTYzOTBcbiAgICB9LFxuICAgIDE3MzgwOiB7XG4gICAgICAgIHVzZXI6ICdlcmljYScsXG4gICAgICAgIHdvcmQ6ICdUaGUgSW50ZXJuZXRcXCdzIG5vdCB3cml0dGVuIGluIHBlbmNpbCwgTWFyaywgaXRcXCdzIHdyaXR0ZW4gaW4gaW5rLicsXG4gICAgICAgIGR1cjogIDE5MzcwIC0gMTczODBcbiAgICB9LFxuICAgIDE5NTYwOiB7XG4gICAgICAgIHVzZXI6ICd3YXJkbycsXG4gICAgICAgIHdvcmQ6ICd1IHRoaW5rIG1heWJlIHdlIHNob3VsZG5cXCd0IHNodXQgaXQgZG93biBiZWZvcmUgd2UgZ2V0IGludG8gdHJvdWJsZT8nLFxuICAgICAgICBkdXI6IDIxNjAwIC0gMTk1NjBcbiAgICB9LFxuICAgIDIxNjgwOiB7XG4gICAgICAgIHVzZXI6ICdkaXZ5YScsXG4gICAgICAgIHdvcmQ6ICdIZSBzdG9sZSBvdXIgd2Vic2l0ZSEhIScsXG4gICAgICAgIGR1cjogMjI0ODAgLSAyMTY4MFxuICAgIH0sXG4gICAgMjI2MDA6IHtcbiAgICAgICAgdXNlcjogJ3dhcmRvJyxcbiAgICAgICAgd29yZDogJ1RoZXlcXCdyZSBzYXlpbmcgdGhhdCB3ZSBzdG9sZSBUaGUgRmFjZWJvb2snLFxuICAgICAgICBkdXI6IDIzOTgwIC0gMjI2MDBcbiAgICB9LFxuICAgIDI0MjAwOiB7XG4gICAgICAgIHVzZXI6ICdtYXJrJyxcbiAgICAgICAgd29yZDogJ0kgS05PVyB3aGF0IGl0IHNheXMuJyxcbiAgICAgICAgZHVyOiAyNDkwMCAtIDI0MjAwXG4gICAgfSxcbiAgICAyNTAwMDoge1xuICAgICAgICB1c2VyOiAnd2FyZG8nLFxuICAgICAgICB3b3JkOiAnc28gZGlkIHdlPz8/JyxcbiAgICAgICAgZHVyOiAyNTMyMCAtIDI1MDAwXG4gICAgfSxcbiAgICAyNTU1MDoge1xuICAgICAgICB1c2VyOiAnbWFyaycsXG4gICAgICAgIHdvcmQ6ICdUaGV5IGNhbWUgdG8gbWUgd2l0aCBhbiBpZGVhLCBJIGhhZCBhIGJldHRlciBvbmUuJyxcbiAgICAgICAgZHVyOiAyNjk1MCAtIDI1NTUwXG4gICAgfSxcbiAgICAyNzA1MDoge1xuICAgICAgICB1c2VyOiAnY2hyaXMnLFxuICAgICAgICB3b3JkOiAnSGUgbWFkZSBUaGUgRmFjZWJvb2s/JyxcbiAgICAgICAgZHVyOiAyNzgyMCAtIDI3MDUwXG4gICAgfSxcbiAgICAyNzg4MDoge1xuICAgICAgICB1c2VyOiAnZHVzdGluJyxcbiAgICAgICAgd29yZDogJ1dobyBhcmUgdGhlIGdpcmxzJyxcbiAgICAgICAgZHVyOiAyODMzOSAtIDI3ODgwXG4gICAgfSxcbiAgICAyODUyMDoge1xuICAgICAgICB1c2VyOiAnd2FyZG8nLFxuICAgICAgICB3b3JkOiAnV2UgaGF2ZSBncm91cGllcy4nLFxuICAgICAgICBkdXI6IDI4OTYwIC0gMjg1MjBcbiAgICB9LFxuICAgIDI5MTAwOiB7XG4gICAgICAgIHVzZXI6ICd0eWxlcicsXG4gICAgICAgIHdvcmQ6ICdUaGlzIGlkZWEgaXMgcG90ZW50aWFsbHkgd29ydGggbWlsbGlvbnMgb2YgZG9sbGFycy4nLFxuICAgICAgICBkdXI6IDMxMTAwIC0gMjkxMDBcbiAgICB9LFxuICAgIDMxMjUwOiB7XG4gICAgICAgIHVzZXI6ICdsYXJyeScsXG4gICAgICAgIHdvcmQ6ICdNaWxsaW9ucz8nLFxuICAgICAgICBkdXI6IDMxNDY0IC0gMzEyNTBcbiAgICB9LFxuICAgIDMxODY4OiB7XG4gICAgICAgIHVzZXI6ICdzZWFuJyxcbiAgICAgICAgd29yZDogJ0EgbWlsbGlvbiAkIGlzblxcJ3QgY29vbC4gWW91IGtub3cgd2hhdFxcJ3MgY29vbD8nLFxuICAgICAgICBkdXI6IDMzNDk0IC0gMzE4NjhcbiAgICB9LFxuICAgIDMzNjk3OiB7XG4gICAgICAgIHVzZXI6ICd3YXJkbycsXG4gICAgICAgIHdvcmQ6ICdVPycsXG4gICAgICAgIGR1cjogMzM5MDAgLSAzMzY5N1xuICAgIH0sXG4gICAgMzQyMDM6IHtcbiAgICAgICAgdXNlcjogJ3NlYW4nLFxuICAgICAgICB3b3JkOiAnQSBCSUxMSU9OICQkJFxcJ3MuJyxcbiAgICAgICAgZHVyOiAzNTAxMCAtIDM0MjAzXG4gICAgfSxcbiAgICAzNTIzMDoge1xuICAgICAgICB1c2VyOiAnd2FyZG8nLFxuICAgICAgICB3b3JkOiAnV2UgZG9uXFwndCBuZWVkIGhpbS4nLFxuICAgICAgICBkdXI6IDM2MTI3IC0gMzUyMzBcbiAgICB9LFxuICAgIDM2MjUwOiB7XG4gICAgICAgIHVzZXI6ICd0eWxlcicsXG4gICAgICAgIHdvcmQ6ICdMZXRcXCdzIFNVRSBoaW0gaW4gZmVkZXJhbCBjb3VydC4nLFxuICAgICAgICBkdXI6IDM3NjU0IC0gMzYyNTBcbiAgICB9LFxuICAgIDM3ODMwOiB7XG4gICAgICAgIHVzZXI6ICdtYXJrJyxcbiAgICAgICAgd29yZDogJ3lvdVxcJ3JlIGdvaW5nIHRvIGdldCBsZWZ0IGJlaGluZC4gSXRcXCdzIG1vdmluZyBmYXN0ZXIuLi4nLFxuICAgICAgICBkdXI6IDM4Nzc5IC0gMzc4MzBcbiAgICB9LFxuICAgIDM5MjYwOiB7XG4gICAgICAgIHVzZXI6ICd3YXJkbycsXG4gICAgICAgIHdvcmQ6ICd3aGF0IGRvIHUgbWVhbi4uLicsXG4gICAgICAgIGR1cjogMzk2ODUgLSAzOTI2MFxuICAgIH0sXG4gICAgMzk1MDA6IHtcbiAgICAgICAgdXNlcjogJ21hcmsnLFxuICAgICAgICB3b3JkOiAndGhhbiBhbnkgb2YgdXMgZXZlciBpbWFnaW5lZCBpdCB3b3VsZCBtb3ZlJyxcbiAgICAgICAgZHVyOiA0MDUwMCAtIDM5NTAwXG4gICAgfSxcbiAgICA0MDU1MDoge1xuICAgICAgICB1c2VyOiAnd2FyZG8nLFxuICAgICAgICB3b3JkOiAnZ2V0IGxlZnQgYmVoaW5kPz8/PycsXG4gICAgICAgIGR1cjogNDA3ODAgLSA0MDU1MFxuICAgIH0sXG4gICAgNDExNzA6IHtcbiAgICAgICAgdXNlcjogJ2NhbWVyb24nLFxuICAgICAgICB3b3JkOiAnV2VcXCdyZSBnZW50bGVtZW4gb2YgSGFydmFyZC4gWW91IGRvblxcJ3Qgc3VlIHBlb3BsZS4nLFxuICAgICAgICBkdXI6IDQzNDAwIC0gNDExNzBcbiAgICB9LFxuICAgIDQzNTIwOiB7XG4gICAgICAgIHVzZXI6ICdzZWFuJyxcbiAgICAgICAgd29yZDogJ1RoaXMgaXMgT1VSIHRpbWUhIScsXG4gICAgICAgIGR1cjogNDQzMDAgLSA0MzUyMFxuICAgIH0sXG4gICAgNDQ0ODA6IHtcbiAgICAgICAgdXNlcjogJ3dhcmRvJyxcbiAgICAgICAgd29yZDogJ0l0XFwncyBnb25uYSBiZSBsaWtlIElcXCdtIG5vdCBhIHBhcnQgb2YgRmFjZWJvb2suJyxcbiAgICAgICAgZHVyOiA0NjAwMCAtIDQ0NDgwXG4gICAgfSxcbiAgICA0NjA1MDoge1xuICAgICAgICB1c2VyOiAnc2VhbicsXG4gICAgICAgIHdvcmQ6ICdZb3VcXCdyZSBub3QgYSBwYXJ0IG9mIEZhY2Vib29rLicsXG4gICAgICAgIGR1cjogNDY5MzAgLSA0NjA1MFxuICAgIH0sXG4gICAgNDcwNDA6IHtcbiAgICAgICAgdXNlcjogJ2RpdnlhJyxcbiAgICAgICAgd29yZDogJ0kgY2FuXFwndCB3YWl0IHRvIHN0YW5kIG92ZXIgeW91ciBzaG91bGRlciBhbmQgd2F0Y2ggeW91IHdyaXRlIHVzIGEgY2hlY2suJyxcbiAgICAgICAgZHVyOiA0OTI4MCAtIDQ3MDQwXG4gICAgfSxcbiAgICA0OTM4MDoge1xuICAgICAgICB1c2VyOiAnd2FyZG8nLFxuICAgICAgICB3b3JkOiAnSXMgdGhlcmUgYW55dGhpbmcgdGhhdCB5b3UgbmVlZCB0byB0ZWxsIG1lPz8/JyxcbiAgICAgICAgZHVyOiA1MDg4MCAtIDQ5MzgwXG4gICAgfSxcbiAgICA1MTAyMDoge1xuICAgICAgICB1c2VyOiAnbWFyaycsXG4gICAgICAgIHdvcmQ6ICd5b3VyIGFjdGlvbnMgY291bGQgaGF2ZSBwZXJtYW5lbnRseSBkZXN0cm95ZWQgRVZFUllUSElORyBJXFwndmUgYmVlbiB3b3JraW5nIG9uLicsXG4gICAgICAgIGR1cjogNTMwNjUgLSA1MTAyMFxuICAgIH0sXG4gICAgNTMyMDA6IHtcbiAgICAgICAgdXNlcjogJ3dhcmRvJyxcbiAgICAgICAgd29yZDogJ1dFIGhhdmUgYmVlbiB3b3JraW5nIG9uISEnLFxuICAgICAgICBkdXI6IDUzOTQwIC0gNTMyMDBcbiAgICB9LFxuICAgIDU0MDg3OiB7XG4gICAgICAgIHVzZXI6ICdtYXJrJyxcbiAgICAgICAgd29yZDogJ0RvIHUgbGlrZSBiZWluZyBhIGpva2U/Pz8gRG8gdSB3YW5uYSBnbyBiYWNrIHRvIHRoYXQ/JyxcbiAgICAgICAgZHVyOiA1NTU1MCAtIDU0MDg3XG4gICAgfSxcbiAgICA1NTYzMDoge1xuICAgICAgICB1c2VyOiAnd2FyZG8nLFxuICAgICAgICB3b3JkOiAnTWFyayEhIScsXG4gICAgICAgIGR1cjogNTU4NDAgLSA1NTYzMFxuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZGF0YTsiLCJ2YXIgdXNlckRhdGEgPSB7XG4gICAgbWFyazoge1xuICAgICAgICBhbGlhczogJ01hcmsgWnVja2VyYmVyZycsXG4gICAgICAgIGF2YXRhcjogJ21hcmsucG5nJ1xuICAgIH0sXG4gICAgd2FyZG86IHtcbiAgICAgICAgYWxpYXM6ICdFZHVhcmRvIFNhdmVyaW4nLFxuICAgICAgICBhdmF0YXI6ICd3YXJkby5wbmcnXG4gICAgfSxcbiAgICBkdXN0aW46IHtcbiAgICAgICAgYWxpYXM6ICdEdXN0aW4gTW9za292aXR6JyxcbiAgICAgICAgYXZhdGFyOiAnZHVzdGluLnBuZydcbiAgICB9LFxuICAgIG1hcnk6IHtcbiAgICAgICAgYWxpYXM6ICdNYXJ5bGluIERlbHB5JyxcbiAgICAgICAgYXZhdGFyOiAnbWFyeS5wbmcnXG4gICAgfSxcbiAgICBlcmljYToge1xuICAgICAgICBhbGlhczogJ0VyaWNhIEFsYnJpZ2h0JyxcbiAgICAgICAgYXZhdGFyOiAnZXJpY2EucG5nJ1xuICAgIH0sXG4gICAgZGl2eWE6IHtcbiAgICAgICAgYWxpYXM6ICdEaXZ5YSBOYXJlbmRyYScsXG4gICAgICAgIGF2YXRhcjogJ2RpdnlhLnBuZydcbiAgICB9LFxuICAgIGNocmlzOiB7XG4gICAgICAgIGFsaWFzOiAnQ2hyaXN0eSBMZWUnLFxuICAgICAgICBhdmF0YXI6ICdjaHJpcy5wbmcnXG4gICAgfSxcbiAgICB0eWxlcjoge1xuICAgICAgICBhbGlhczogJ1R5bGVyIFdpbmtsZXZvc3MnLFxuICAgICAgICBhdmF0YXI6ICd0eWxlci5wbmcnXG4gICAgfSxcbiAgICBsYXJyeToge1xuICAgICAgICBhbGlhczogJ0xhcnJ5IFN1bW1lcnMnLFxuICAgICAgICBhdmF0YXI6ICdsYXJyeS5wbmcnXG4gICAgfSxcbiAgICBzZWFuOiB7XG4gICAgICAgIGFsaWFzOiAnU2VhbiBQYXJrZXInLFxuICAgICAgICBhdmF0YXI6ICdzZWFuLnBuZydcbiAgICB9LFxuICAgIGNhbWVyb246IHtcbiAgICAgICAgYWxpYXM6ICdDYW1lcm9uIFdpbmtsZXZvc3MnLFxuICAgICAgICBhdmF0YXI6ICdjYW1lcm9uLnBuZydcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHVzZXJEYXRhOyIsInZhciBEaXNwYXRjaGVyID0gcmVxdWlyZSgnLi9EaXNwYXRjaGVyJyk7XG5cblxuLy8gZGlzcGF0Y2hlciDnnJ/nmoTlvojnroDljZUsIOWvueS6jueOsOWcqOeahHRvZG9hcHDmnaXor7Rcbi8vIOa3u+WKoOS4gOS4quWkhOeQhnZpZXdhY3Rpb27nmoTmlrnms5UsIOi/m+ihjOWIhuWPkS4uLiDliIblj5HnmoTlj4LmlbDlj6/ku6Xnp7DkvZxwYXlsb2FkXG4vLyDlnKjnm7jlupTnmoRzdG9yZeS4rSwg5bCGYWN0aW9u55qEaGFuZGxlcuazqOWGjOWcqGRpc3BhdGNoZXLkuIpcblxudmFyIGNvcHlQcm9wZXJ0aWVzID0gcmVxdWlyZSgncmVhY3QvbGliL2NvcHlQcm9wZXJ0aWVzJyk7XG5cbnZhciBDaGF0RGlzcGF0Y2hlciA9IGNvcHlQcm9wZXJ0aWVzKG5ldyBEaXNwYXRjaGVyKCksIHtcbiAgICBoYW5kbGVNb3ZpZUFjdGlvbjogZnVuY3Rpb24oYWN0aW9uKXtcbiAgICAgICAgdGhpcy5kaXNwYXRjaCh7XG4gICAgICAgICAgICBzb3VyY2U6ICdNT1ZJRV9BQ1RJT04nLFxuICAgICAgICAgICAgYWN0aW9uOiBhY3Rpb25cbiAgICAgICAgfSk7XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2hhdERpc3BhdGNoZXI7IiwiLypcbiAqIENvcHlyaWdodCAoYykgMjAxNCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICpcbiAqIEBwcm92aWRlc01vZHVsZSBEaXNwYXRjaGVyXG4gKiBAdHlwZWNoZWNrc1xuICovXG5cbnZhciBpbnZhcmlhbnQgPSByZXF1aXJlKCcuL2ludmFyaWFudCcpO1xuXG52YXIgX2xhc3RJRCA9IDE7XG52YXIgX3ByZWZpeCA9ICdJRF8nO1xuXG4vKipcbiAqIERpc3BhdGNoZXIgaXMgdXNlZCB0byBicm9hZGNhc3QgcGF5bG9hZHMgdG8gcmVnaXN0ZXJlZCBjYWxsYmFja3MuIFRoaXMgaXNcbiAqIGRpZmZlcmVudCBmcm9tIGdlbmVyaWMgcHViLXN1YiBzeXN0ZW1zIGluIHR3byB3YXlzOlxuICpcbiAqICAgMSkgQ2FsbGJhY2tzIGFyZSBub3Qgc3Vic2NyaWJlZCB0byBwYXJ0aWN1bGFyIGV2ZW50cy4gRXZlcnkgcGF5bG9hZCBpc1xuICogICAgICBkaXNwYXRjaGVkIHRvIGV2ZXJ5IHJlZ2lzdGVyZWQgY2FsbGJhY2suXG4gKiAgIDIpIENhbGxiYWNrcyBjYW4gYmUgZGVmZXJyZWQgaW4gd2hvbGUgb3IgcGFydCB1bnRpbCBvdGhlciBjYWxsYmFja3MgaGF2ZVxuICogICAgICBiZWVuIGV4ZWN1dGVkLlxuICpcbiAqIEZvciBleGFtcGxlLCBjb25zaWRlciB0aGlzIGh5cG90aGV0aWNhbCBmbGlnaHQgZGVzdGluYXRpb24gZm9ybSwgd2hpY2hcbiAqIHNlbGVjdHMgYSBkZWZhdWx0IGNpdHkgd2hlbiBhIGNvdW50cnkgaXMgc2VsZWN0ZWQ6XG4gKlxuICogICB2YXIgZmxpZ2h0RGlzcGF0Y2hlciA9IG5ldyBEaXNwYXRjaGVyKCk7XG4gKlxuICogICAvLyBLZWVwcyB0cmFjayBvZiB3aGljaCBjb3VudHJ5IGlzIHNlbGVjdGVkXG4gKiAgIHZhciBDb3VudHJ5U3RvcmUgPSB7Y291bnRyeTogbnVsbH07XG4gKlxuICogICAvLyBLZWVwcyB0cmFjayBvZiB3aGljaCBjaXR5IGlzIHNlbGVjdGVkXG4gKiAgIHZhciBDaXR5U3RvcmUgPSB7Y2l0eTogbnVsbH07XG4gKlxuICogICAvLyBLZWVwcyB0cmFjayBvZiB0aGUgYmFzZSBmbGlnaHQgcHJpY2Ugb2YgdGhlIHNlbGVjdGVkIGNpdHlcbiAqICAgdmFyIEZsaWdodFByaWNlU3RvcmUgPSB7cHJpY2U6IG51bGx9XG4gKlxuICogV2hlbiBhIHVzZXIgY2hhbmdlcyB0aGUgc2VsZWN0ZWQgY2l0eSwgd2UgZGlzcGF0Y2ggdGhlIHBheWxvYWQ6XG4gKlxuICogICBmbGlnaHREaXNwYXRjaGVyLmRpc3BhdGNoKHtcbiAqICAgICBhY3Rpb25UeXBlOiAnY2l0eS11cGRhdGUnLFxuICogICAgIHNlbGVjdGVkQ2l0eTogJ3BhcmlzJ1xuICogICB9KTtcbiAqXG4gKiBUaGlzIHBheWxvYWQgaXMgZGlnZXN0ZWQgYnkgYENpdHlTdG9yZWA6XG4gKlxuICogICBmbGlnaHREaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpKSB7XG4gKiAgICAgaWYgKHBheWxvYWQuYWN0aW9uVHlwZSA9PT0gJ2NpdHktdXBkYXRlJykge1xuICogICAgICAgQ2l0eVN0b3JlLmNpdHkgPSBwYXlsb2FkLnNlbGVjdGVkQ2l0eTtcbiAqICAgICB9XG4gKiAgIH0pO1xuICpcbiAqIFdoZW4gdGhlIHVzZXIgc2VsZWN0cyBhIGNvdW50cnksIHdlIGRpc3BhdGNoIHRoZSBwYXlsb2FkOlxuICpcbiAqICAgZmxpZ2h0RGlzcGF0Y2hlci5kaXNwYXRjaCh7XG4gKiAgICAgYWN0aW9uVHlwZTogJ2NvdW50cnktdXBkYXRlJyxcbiAqICAgICBzZWxlY3RlZENvdW50cnk6ICdhdXN0cmFsaWEnXG4gKiAgIH0pO1xuICpcbiAqIFRoaXMgcGF5bG9hZCBpcyBkaWdlc3RlZCBieSBib3RoIHN0b3JlczpcbiAqXG4gKiAgICBDb3VudHJ5U3RvcmUuZGlzcGF0Y2hUb2tlbiA9IGZsaWdodERpc3BhdGNoZXIucmVnaXN0ZXIoZnVuY3Rpb24ocGF5bG9hZCkge1xuICogICAgIGlmIChwYXlsb2FkLmFjdGlvblR5cGUgPT09ICdjb3VudHJ5LXVwZGF0ZScpIHtcbiAqICAgICAgIENvdW50cnlTdG9yZS5jb3VudHJ5ID0gcGF5bG9hZC5zZWxlY3RlZENvdW50cnk7XG4gKiAgICAgfVxuICogICB9KTtcbiAqXG4gKiBXaGVuIHRoZSBjYWxsYmFjayB0byB1cGRhdGUgYENvdW50cnlTdG9yZWAgaXMgcmVnaXN0ZXJlZCwgd2Ugc2F2ZSBhIHJlZmVyZW5jZVxuICogdG8gdGhlIHJldHVybmVkIHRva2VuLiBVc2luZyB0aGlzIHRva2VuIHdpdGggYHdhaXRGb3IoKWAsIHdlIGNhbiBndWFyYW50ZWVcbiAqIHRoYXQgYENvdW50cnlTdG9yZWAgaXMgdXBkYXRlZCBiZWZvcmUgdGhlIGNhbGxiYWNrIHRoYXQgdXBkYXRlcyBgQ2l0eVN0b3JlYFxuICogbmVlZHMgdG8gcXVlcnkgaXRzIGRhdGEuXG4gKlxuICogICBDaXR5U3RvcmUuZGlzcGF0Y2hUb2tlbiA9IGZsaWdodERpc3BhdGNoZXIucmVnaXN0ZXIoZnVuY3Rpb24ocGF5bG9hZCkge1xuICogICAgIGlmIChwYXlsb2FkLmFjdGlvblR5cGUgPT09ICdjb3VudHJ5LXVwZGF0ZScpIHtcbiAqICAgICAgIC8vIGBDb3VudHJ5U3RvcmUuY291bnRyeWAgbWF5IG5vdCBiZSB1cGRhdGVkLlxuICogICAgICAgZmxpZ2h0RGlzcGF0Y2hlci53YWl0Rm9yKFtDb3VudHJ5U3RvcmUuZGlzcGF0Y2hUb2tlbl0pO1xuICogICAgICAgLy8gYENvdW50cnlTdG9yZS5jb3VudHJ5YCBpcyBub3cgZ3VhcmFudGVlZCB0byBiZSB1cGRhdGVkLlxuICpcbiAqICAgICAgIC8vIFNlbGVjdCB0aGUgZGVmYXVsdCBjaXR5IGZvciB0aGUgbmV3IGNvdW50cnlcbiAqICAgICAgIENpdHlTdG9yZS5jaXR5ID0gZ2V0RGVmYXVsdENpdHlGb3JDb3VudHJ5KENvdW50cnlTdG9yZS5jb3VudHJ5KTtcbiAqICAgICB9XG4gKiAgIH0pO1xuICpcbiAqIFRoZSB1c2FnZSBvZiBgd2FpdEZvcigpYCBjYW4gYmUgY2hhaW5lZCwgZm9yIGV4YW1wbGU6XG4gKlxuICogICBGbGlnaHRQcmljZVN0b3JlLmRpc3BhdGNoVG9rZW4gPVxuICogICAgIGZsaWdodERpc3BhdGNoZXIucmVnaXN0ZXIoZnVuY3Rpb24ocGF5bG9hZCkpIHtcbiAqICAgICAgIHN3aXRjaCAocGF5bG9hZC5hY3Rpb25UeXBlKSB7XG4gKiAgICAgICAgIGNhc2UgJ2NvdW50cnktdXBkYXRlJzpcbiAqICAgICAgICAgICBmbGlnaHREaXNwYXRjaGVyLndhaXRGb3IoW0NpdHlTdG9yZS5kaXNwYXRjaFRva2VuXSk7XG4gKiAgICAgICAgICAgRmxpZ2h0UHJpY2VTdG9yZS5wcmljZSA9XG4gKiAgICAgICAgICAgICBnZXRGbGlnaHRQcmljZVN0b3JlKENvdW50cnlTdG9yZS5jb3VudHJ5LCBDaXR5U3RvcmUuY2l0eSk7XG4gKiAgICAgICAgICAgYnJlYWs7XG4gKlxuICogICAgICAgICBjYXNlICdjaXR5LXVwZGF0ZSc6XG4gKiAgICAgICAgICAgRmxpZ2h0UHJpY2VTdG9yZS5wcmljZSA9XG4gKiAgICAgICAgICAgICBGbGlnaHRQcmljZVN0b3JlKENvdW50cnlTdG9yZS5jb3VudHJ5LCBDaXR5U3RvcmUuY2l0eSk7XG4gKiAgICAgICAgICAgYnJlYWs7XG4gKiAgICAgfVxuICogICB9KTtcbiAqXG4gKiBUaGUgYGNvdW50cnktdXBkYXRlYCBwYXlsb2FkIHdpbGwgYmUgZ3VhcmFudGVlZCB0byBpbnZva2UgdGhlIHN0b3JlcydcbiAqIHJlZ2lzdGVyZWQgY2FsbGJhY2tzIGluIG9yZGVyOiBgQ291bnRyeVN0b3JlYCwgYENpdHlTdG9yZWAsIHRoZW5cbiAqIGBGbGlnaHRQcmljZVN0b3JlYC5cbiAqL1xuXG4gIGZ1bmN0aW9uIERpc3BhdGNoZXIoKSB7XCJ1c2Ugc3RyaWN0XCI7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3MgPSB7fTtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2lzUGVuZGluZyA9IHt9O1xuICAgIHRoaXMuJERpc3BhdGNoZXJfaXNIYW5kbGVkID0ge307XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0Rpc3BhdGNoaW5nID0gZmFsc2U7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9wZW5kaW5nUGF5bG9hZCA9IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXJzIGEgY2FsbGJhY2sgdG8gYmUgaW52b2tlZCB3aXRoIGV2ZXJ5IGRpc3BhdGNoZWQgcGF5bG9hZC4gUmV0dXJuc1xuICAgKiBhIHRva2VuIHRoYXQgY2FuIGJlIHVzZWQgd2l0aCBgd2FpdEZvcigpYC5cbiAgICpcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2tcbiAgICogQHJldHVybiB7c3RyaW5nfVxuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUucmVnaXN0ZXI9ZnVuY3Rpb24oY2FsbGJhY2spIHtcInVzZSBzdHJpY3RcIjtcbiAgICB2YXIgaWQgPSBfcHJlZml4ICsgX2xhc3RJRCsrO1xuICAgIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzW2lkXSA9IGNhbGxiYWNrO1xuICAgIHJldHVybiBpZDtcbiAgfTtcblxuICAvKipcbiAgICogUmVtb3ZlcyBhIGNhbGxiYWNrIGJhc2VkIG9uIGl0cyB0b2tlbi5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGlkXG4gICAqL1xuICBEaXNwYXRjaGVyLnByb3RvdHlwZS51bnJlZ2lzdGVyPWZ1bmN0aW9uKGlkKSB7XCJ1c2Ugc3RyaWN0XCI7XG4gICAgaW52YXJpYW50KFxuICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3NbaWRdLFxuICAgICAgJ0Rpc3BhdGNoZXIudW5yZWdpc3RlciguLi4pOiBgJXNgIGRvZXMgbm90IG1hcCB0byBhIHJlZ2lzdGVyZWQgY2FsbGJhY2suJyxcbiAgICAgIGlkXG4gICAgKTtcbiAgICBkZWxldGUgdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3NbaWRdO1xuICB9O1xuXG4gIC8qKlxuICAgKiBXYWl0cyBmb3IgdGhlIGNhbGxiYWNrcyBzcGVjaWZpZWQgdG8gYmUgaW52b2tlZCBiZWZvcmUgY29udGludWluZyBleGVjdXRpb25cbiAgICogb2YgdGhlIGN1cnJlbnQgY2FsbGJhY2suIFRoaXMgbWV0aG9kIHNob3VsZCBvbmx5IGJlIHVzZWQgYnkgYSBjYWxsYmFjayBpblxuICAgKiByZXNwb25zZSB0byBhIGRpc3BhdGNoZWQgcGF5bG9hZC5cbiAgICpcbiAgICogQHBhcmFtIHthcnJheTxzdHJpbmc+fSBpZHNcbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLndhaXRGb3I9ZnVuY3Rpb24oaWRzKSB7XCJ1c2Ugc3RyaWN0XCI7XG4gICAgaW52YXJpYW50KFxuICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0Rpc3BhdGNoaW5nLFxuICAgICAgJ0Rpc3BhdGNoZXIud2FpdEZvciguLi4pOiBNdXN0IGJlIGludm9rZWQgd2hpbGUgZGlzcGF0Y2hpbmcuJ1xuICAgICk7XG4gICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IGlkcy5sZW5ndGg7IGlpKyspIHtcbiAgICAgIHZhciBpZCA9IGlkc1tpaV07XG4gICAgICBpZiAodGhpcy4kRGlzcGF0Y2hlcl9pc1BlbmRpbmdbaWRdKSB7XG4gICAgICAgIGludmFyaWFudChcbiAgICAgICAgICB0aGlzLiREaXNwYXRjaGVyX2lzSGFuZGxlZFtpZF0sXG4gICAgICAgICAgJ0Rpc3BhdGNoZXIud2FpdEZvciguLi4pOiBDaXJjdWxhciBkZXBlbmRlbmN5IGRldGVjdGVkIHdoaWxlICcgK1xuICAgICAgICAgICd3YWl0aW5nIGZvciBgJXNgLicsXG4gICAgICAgICAgaWRcbiAgICAgICAgKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpbnZhcmlhbnQoXG4gICAgICAgIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzW2lkXSxcbiAgICAgICAgJ0Rpc3BhdGNoZXIud2FpdEZvciguLi4pOiBgJXNgIGRvZXMgbm90IG1hcCB0byBhIHJlZ2lzdGVyZWQgY2FsbGJhY2suJyxcbiAgICAgICAgaWRcbiAgICAgICk7XG4gICAgICB0aGlzLiREaXNwYXRjaGVyX2ludm9rZUNhbGxiYWNrKGlkKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIERpc3BhdGNoZXMgYSBwYXlsb2FkIHRvIGFsbCByZWdpc3RlcmVkIGNhbGxiYWNrcy5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IHBheWxvYWRcbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLmRpc3BhdGNoPWZ1bmN0aW9uKHBheWxvYWQpIHtcInVzZSBzdHJpY3RcIjtcbiAgICBpbnZhcmlhbnQoXG4gICAgICAhdGhpcy4kRGlzcGF0Y2hlcl9pc0Rpc3BhdGNoaW5nLFxuICAgICAgJ0Rpc3BhdGNoLmRpc3BhdGNoKC4uLik6IENhbm5vdCBkaXNwYXRjaCBpbiB0aGUgbWlkZGxlIG9mIGEgZGlzcGF0Y2guJ1xuICAgICk7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9zdGFydERpc3BhdGNoaW5nKHBheWxvYWQpO1xuICAgIHRyeSB7XG4gICAgICBmb3IgKHZhciBpZCBpbiB0aGlzLiREaXNwYXRjaGVyX2NhbGxiYWNrcykge1xuICAgICAgICBpZiAodGhpcy4kRGlzcGF0Y2hlcl9pc1BlbmRpbmdbaWRdKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9pbnZva2VDYWxsYmFjayhpZCk7XG4gICAgICB9XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHRoaXMuJERpc3BhdGNoZXJfc3RvcERpc3BhdGNoaW5nKCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBJcyB0aGlzIERpc3BhdGNoZXIgY3VycmVudGx5IGRpc3BhdGNoaW5nLlxuICAgKlxuICAgKiBAcmV0dXJuIHtib29sZWFufVxuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUuaXNEaXNwYXRjaGluZz1mdW5jdGlvbigpIHtcInVzZSBzdHJpY3RcIjtcbiAgICByZXR1cm4gdGhpcy4kRGlzcGF0Y2hlcl9pc0Rpc3BhdGNoaW5nO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDYWxsIHRoZSBjYWxsYmFjayBzdG9yZWQgd2l0aCB0aGUgZ2l2ZW4gaWQuIEFsc28gZG8gc29tZSBpbnRlcm5hbFxuICAgKiBib29ra2VlcGluZy5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGlkXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUuJERpc3BhdGNoZXJfaW52b2tlQ2FsbGJhY2s9ZnVuY3Rpb24oaWQpIHtcInVzZSBzdHJpY3RcIjtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2lzUGVuZGluZ1tpZF0gPSB0cnVlO1xuICAgIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzW2lkXSh0aGlzLiREaXNwYXRjaGVyX3BlbmRpbmdQYXlsb2FkKTtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2lzSGFuZGxlZFtpZF0gPSB0cnVlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBTZXQgdXAgYm9va2tlZXBpbmcgbmVlZGVkIHdoZW4gZGlzcGF0Y2hpbmcuXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBwYXlsb2FkXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUuJERpc3BhdGNoZXJfc3RhcnREaXNwYXRjaGluZz1mdW5jdGlvbihwYXlsb2FkKSB7XCJ1c2Ugc3RyaWN0XCI7XG4gICAgZm9yICh2YXIgaWQgaW4gdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3MpIHtcbiAgICAgIHRoaXMuJERpc3BhdGNoZXJfaXNQZW5kaW5nW2lkXSA9IGZhbHNlO1xuICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0hhbmRsZWRbaWRdID0gZmFsc2U7XG4gICAgfVxuICAgIHRoaXMuJERpc3BhdGNoZXJfcGVuZGluZ1BheWxvYWQgPSBwYXlsb2FkO1xuICAgIHRoaXMuJERpc3BhdGNoZXJfaXNEaXNwYXRjaGluZyA9IHRydWU7XG4gIH07XG5cbiAgLyoqXG4gICAqIENsZWFyIGJvb2trZWVwaW5nIHVzZWQgZm9yIGRpc3BhdGNoaW5nLlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLiREaXNwYXRjaGVyX3N0b3BEaXNwYXRjaGluZz1mdW5jdGlvbigpIHtcInVzZSBzdHJpY3RcIjtcbiAgICB0aGlzLiREaXNwYXRjaGVyX3BlbmRpbmdQYXlsb2FkID0gbnVsbDtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2lzRGlzcGF0Y2hpbmcgPSBmYWxzZTtcbiAgfTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IERpc3BhdGNoZXI7XG4iLCIvKipcbiAqIENvcHlyaWdodCAoYykgMjAxNCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICpcbiAqIEBwcm92aWRlc01vZHVsZSBpbnZhcmlhbnRcbiAqL1xuXG5cInVzZSBzdHJpY3RcIjtcblxuLyoqXG4gKiBVc2UgaW52YXJpYW50KCkgdG8gYXNzZXJ0IHN0YXRlIHdoaWNoIHlvdXIgcHJvZ3JhbSBhc3N1bWVzIHRvIGJlIHRydWUuXG4gKlxuICogUHJvdmlkZSBzcHJpbnRmLXN0eWxlIGZvcm1hdCAob25seSAlcyBpcyBzdXBwb3J0ZWQpIGFuZCBhcmd1bWVudHNcbiAqIHRvIHByb3ZpZGUgaW5mb3JtYXRpb24gYWJvdXQgd2hhdCBicm9rZSBhbmQgd2hhdCB5b3Ugd2VyZVxuICogZXhwZWN0aW5nLlxuICpcbiAqIFRoZSBpbnZhcmlhbnQgbWVzc2FnZSB3aWxsIGJlIHN0cmlwcGVkIGluIHByb2R1Y3Rpb24sIGJ1dCB0aGUgaW52YXJpYW50XG4gKiB3aWxsIHJlbWFpbiB0byBlbnN1cmUgbG9naWMgZG9lcyBub3QgZGlmZmVyIGluIHByb2R1Y3Rpb24uXG4gKi9cblxudmFyIGludmFyaWFudCA9IGZ1bmN0aW9uKGNvbmRpdGlvbiwgZm9ybWF0LCBhLCBiLCBjLCBkLCBlLCBmKSB7XG4gIGlmIChmYWxzZSkge1xuICAgIGlmIChmb3JtYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbnZhcmlhbnQgcmVxdWlyZXMgYW4gZXJyb3IgbWVzc2FnZSBhcmd1bWVudCcpO1xuICAgIH1cbiAgfVxuXG4gIGlmICghY29uZGl0aW9uKSB7XG4gICAgdmFyIGVycm9yO1xuICAgIGlmIChmb3JtYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoXG4gICAgICAgICdNaW5pZmllZCBleGNlcHRpb24gb2NjdXJyZWQ7IHVzZSB0aGUgbm9uLW1pbmlmaWVkIGRldiBlbnZpcm9ubWVudCAnICtcbiAgICAgICAgJ2ZvciB0aGUgZnVsbCBlcnJvciBtZXNzYWdlIGFuZCBhZGRpdGlvbmFsIGhlbHBmdWwgd2FybmluZ3MuJ1xuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGFyZ3MgPSBbYSwgYiwgYywgZCwgZSwgZl07XG4gICAgICB2YXIgYXJnSW5kZXggPSAwO1xuICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoXG4gICAgICAgICdJbnZhcmlhbnQgVmlvbGF0aW9uOiAnICtcbiAgICAgICAgZm9ybWF0LnJlcGxhY2UoLyVzL2csIGZ1bmN0aW9uKCkgeyByZXR1cm4gYXJnc1thcmdJbmRleCsrXTsgfSlcbiAgICAgICk7XG4gICAgfVxuXG4gICAgZXJyb3IuZnJhbWVzVG9Qb3AgPSAxOyAvLyB3ZSBkb24ndCBjYXJlIGFib3V0IGludmFyaWFudCdzIG93biBmcmFtZVxuICAgIHRocm93IGVycm9yO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGludmFyaWFudDtcbiIsIi8qKlxuICogQGpzeCBSZWFjdC5ET01cbiAqLyBcblxudmFyIENoYXRMaXN0ID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL0NoYXRMaXN0LnJlYWN0LmpzJyk7XG52YXIgTW92aWVDdHJsID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL01vdmllLmpzJyk7XG5cblxuUmVhY3QucmVuZGVyQ29tcG9uZW50KENoYXRMaXN0KHtzY3JvbGxFbGU6IFwiI21zZy1tb2R1bGUgLnNjcm9sbC13cmFwcGVyXCIsIHNjcm9sbEN0bjogXCIjbXNnLW1vZHVsZVwifSksICQoJyNtc2ctbW9kdWxlIC5saXN0LWN0bicpLmdldCgwKSk7XG5cblxuJCgnLnNpbXVsYXRlLXZpZGVvIGF1ZGlvJykub24oJ3BsYXknLCBmdW5jdGlvbigpe1xuICAgIE1vdmllQ3RybC5zdGFydCgpO1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgJCgnI21zZy1tb2R1bGUnKS5yZW1vdmVDbGFzcygnaGlkZGVuJyk7XG4gICAgfSwgMjQwMCk7XG5cbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICQoJy5tYXNrLmN1cnRhaW4nKS5yZW1vdmVDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICQoJy5tb3ZpZS10aXRsZScpLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgfSwgMjAwMCk7XG4gICAgLy8gYmVmb3JlIHdhcmRvOiBtYXJrISEhXG4gICAgfSw1NTM1MCk7XG5cbiAgICAvLyDpmpDol4/mjonmjqfliLbmnaFcbiAgICAkKHRoaXMpLmNzcygnb3BhY2l0eScsIDApO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICQoc2VsZikucmVtb3ZlQXR0cignY29udHJvbHMnKTtcbiAgICB9LCAxMDAwKTtcbiAgICBcbn0pOyIsIlxuXG5cbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG52YXIgbWVyZ2UgPSByZXF1aXJlKCdyZWFjdC9saWIvbWVyZ2UnKTtcblxudmFyIENoYXREaXNwYXRjaGVyID0gcmVxdWlyZSgnLi4vZGlzcGF0Y2hlci9DaGF0RGlzcGF0Y2hlcicpO1xudmFyIENoYXRDb25zdGFudHMgPSByZXF1aXJlKCcuLi9jb25zdGFudHMvQ2hhdENvbnN0YW50cycpO1xuXG52YXIgQ0hBTkdFX0VWRU5UID0gJ2NoYW5nZSc7XG5cbnZhciBkaWFsb2dEYXRhID0gcmVxdWlyZSgnLi4vZGF0YS9kaWFsb2dEYXRhLmpzJyk7XG52YXIgdXNlckRhdGEgPSByZXF1aXJlKCcuLi9kYXRhL3VzZXJEYXRhLmpzJyk7XG5cblxudmFyIF9kYXRhID0ge307XG5cbi8vIF9kYXRhID0gZGlhbG9nRGF0YTtcblxuZnVuY3Rpb24gZ2V0QWxsKCl7XG4gICAgdmFyIGFyciA9IFtdO1xuICAgIGZvciggdmFyIGkgaW4gX2RhdGEgKXtcbiAgICAgICAgYXJyLnB1c2goIF9kYXRhW2ldIClcbiAgICB9XG4gICAgcmV0dXJuIGFycjtcbn1cblxuZnVuY3Rpb24gY3JlYXRlT25lKGlkLCBvYmope1xuICAgIF9kYXRhW2lkXSA9IG9iajtcbn1cblxuZnVuY3Rpb24gdXBkYXRlT25lKGlkLCB1cGRhdGVzKXtcbiAgICBfZGF0YVtpZF0gPSBtZXJnZShfZGF0YVtpZF0sIHVwZGF0ZXMpO1xufVxuXG52YXIgQ2hhdFN0b3JlID0gbWVyZ2UoRXZlbnRFbWl0dGVyLnByb3RvdHlwZSwge1xuICAgIGdldEFsbDogZ2V0QWxsLFxuICAgIGVtaXRDaGFuZ2U6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuZW1pdChDSEFOR0VfRVZFTlQpO1xuICAgIH0sXG4gICAgYWRkQ2hhbmdlTGlzdGVuZXI6IGZ1bmN0aW9uKGNhbGxiYWNrKXtcbiAgICAgICAgdGhpcy5vbihDSEFOR0VfRVZFTlQsIGNhbGxiYWNrKVxuICAgIH0sXG4gICAgcmVtb3ZlQ2hhbmdlTGlzdGVuZXI6IGZ1bmN0aW9uKGNhbGxiYWNrKXtcbiAgICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcihDSEFOR0VfRVZFTlQsIGNhbGxiYWNrKVxuICAgIH1cbn0pO1xuXG5cbkNoYXREaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpe1xuICAgIHZhciBhY3Rpb24gPSBwYXlsb2FkLmFjdGlvbjtcblxuICAgIHN3aXRjaChhY3Rpb24uYWN0aW9uVHlwZSl7XG4gICAgICAgIGNhc2UgQ2hhdENvbnN0YW50cy5XT1JEX0NSRUFURTpcbiAgICAgICAgICAgIGNyZWF0ZU9uZShhY3Rpb24uaWQsIGFjdGlvbi53b3JkKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIENoYXRDb25zdGFudHMuV09SRF9VUERBVEU6XG4gICAgICAgICAgICB1cGRhdGVPbmUoYWN0aW9uLmlkLCBhY3Rpb24udXBkYXRlcyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdjaGF0IHN0b3JlIGRvIG5vdCBoYW5kbGUgdGhpcyBhY3Rpb24nLCBhY3Rpb24pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgQ2hhdFN0b3JlLmVtaXRDaGFuZ2UoKTtcblxuICAgIHJldHVybiB0cnVlO1xufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBDaGF0U3RvcmU7Il19
