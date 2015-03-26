/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!********************!*\
  !*** ./lib/app.js ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	var ChatList = __webpack_require__(/*! ./components/ChatList.react.js */ 1);
	var MovieCtrl = __webpack_require__(/*! ./components/Movie.js */ 2);
	
	
	// React.renderComponent
	var ctn = $('#msg-module .list-ctn').get(0);
	
	React.render(React.createElement(ChatList, {scrollEle: "#msg-module .scroll-wrapper", scrollCtn: "#msg-module"}), ctn);
	
	
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

/***/ },
/* 1 */
/*!******************************************!*\
  !*** ./lib/components/ChatList.react.js ***!
  \******************************************/
/***/ function(module, exports, __webpack_require__) {

	var ChatStore = __webpack_require__(/*! ../stores/ChatStore.js */ 7)
	
	var ChatWord = __webpack_require__(/*! ./ChatWord.react.js */ 3);
	
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
	
	var ChatList = React.createClass({displayName: "ChatList",
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
	            return React.createElement(ChatWord, {item: item, key: i});
	        });
	
	        return (
	            React.createElement("ul", {id: "msg-list"}, 
	                React.createElement(ReactCSSTransitionGroup, {transitionName: "msg-item"}, 
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

/***/ },
/* 2 */
/*!*********************************!*\
  !*** ./lib/components/Movie.js ***!
  \*********************************/
/***/ function(module, exports, __webpack_require__) {

	var MovieAction = __webpack_require__(/*! ../actions/MovieAction.js */ 4);
	var dialogData = __webpack_require__(/*! ../data/dialogData.js */ 5);
	var userData = __webpack_require__(/*! ../data/userData.js */ 6);
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

/***/ },
/* 3 */
/*!******************************************!*\
  !*** ./lib/components/ChatWord.react.js ***!
  \******************************************/
/***/ function(module, exports, __webpack_require__) {

	function buildMsgItem(msg){
	    return (
	        React.createElement("li", {className: "msg-item"}, 
	            React.createElement("img", {src: msg.avatar, className: "avatar"}), 
	            React.createElement("div", {className: "msg-content"}, 
	                React.createElement("span", {className: "msg-user-name"}, msg.alias), 
	                React.createElement("span", {className: "msg-text"}, msg.word)
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
	
	
	var ChatWord = React.createClass({displayName: "ChatWord",
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

/***/ },
/* 4 */
/*!************************************!*\
  !*** ./lib/actions/MovieAction.js ***!
  \************************************/
/***/ function(module, exports, __webpack_require__) {

	
	// 声明所有的action
	// 由哪个dispatcher负责分发
	// 分发的payload中的actionType是什么
	// 这个action所需要的参数, 接收并传给分发器
	
	var ChatDispatcher = __webpack_require__(/*! ../dispatcher/ChatDispatcher */ 8);
	var ChatConstants = __webpack_require__(/*! ../constants/ChatConstants */ 9);
	
	var MovieActions = {
	    // start time as id
	    create: function(word, id){
	        ChatDispatcher.dispatch({
	            actionType: ChatConstants.WORD_CREATE,
	            word: word,
	            id: id
	        })
	    },
	    update: function(id, updates){
	        ChatDispatcher.dispatch({
	            actionType: ChatConstants.WORD_UPDATE,
	            id: id,
	            updates: updates
	        });
	    }
	};
	
	
	module.exports = MovieActions;
	


/***/ },
/* 5 */
/*!********************************!*\
  !*** ./lib/data/dialogData.js ***!
  \********************************/
/***/ function(module, exports, __webpack_require__) {

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

/***/ },
/* 6 */
/*!******************************!*\
  !*** ./lib/data/userData.js ***!
  \******************************/
/***/ function(module, exports, __webpack_require__) {

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

/***/ },
/* 7 */
/*!*********************************!*\
  !*** ./lib/stores/ChatStore.js ***!
  \*********************************/
/***/ function(module, exports, __webpack_require__) {

	
	
	
	var EventEmitter = __webpack_require__(/*! events */ 10).EventEmitter;
	var assign = __webpack_require__(/*! object-assign */ 11);
	
	var ChatDispatcher = __webpack_require__(/*! ../dispatcher/ChatDispatcher */ 8);
	var ChatConstants = __webpack_require__(/*! ../constants/ChatConstants */ 9);
	
	var CHANGE_EVENT = 'change';
	
	var dialogData = __webpack_require__(/*! ../data/dialogData.js */ 5);
	var userData = __webpack_require__(/*! ../data/userData.js */ 6);
	
	
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
	    _data[id] = assign(_data[id], updates);
	}
	
	var ChatStore = assign({}, EventEmitter.prototype, {
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
	
	
	ChatDispatcher.register(function(action){
	
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

/***/ },
/* 8 */
/*!******************************************!*\
  !*** ./lib/dispatcher/ChatDispatcher.js ***!
  \******************************************/
/***/ function(module, exports, __webpack_require__) {

	var Dispatcher = __webpack_require__(/*! flux */ 12).Dispatcher;
	
	module.exports = new Dispatcher();
	
	// var ChatDispatcher = copyProperties(new Dispatcher(), {
	//     handleMovieAction: function(action){
	//         this.dispatch({
	//             source: 'MOVIE_ACTION',
	//             action: action
	//         });
	//     }
	// });
	
	// module.exports = ChatDispatcher;

/***/ },
/* 9 */
/*!****************************************!*\
  !*** ./lib/constants/ChatConstants.js ***!
  \****************************************/
/***/ function(module, exports, __webpack_require__) {

	var keyMirror = __webpack_require__(/*! keymirror */ 13);
	
	module.exports = keyMirror({
	    WORD_CREATE: null,
	    WORD_UPDATE: null
	});

/***/ },
/* 10 */
/*!********************************************************!*\
  !*** (webpack)/~/node-libs-browser/~/events/events.js ***!
  \********************************************************/
/***/ function(module, exports, __webpack_require__) {

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


/***/ },
/* 11 */
/*!**********************************!*\
  !*** ./~/object-assign/index.js ***!
  \**********************************/
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	function ToObject(val) {
		if (val == null) {
			throw new TypeError('Object.assign cannot be called with null or undefined');
		}
	
		return Object(val);
	}
	
	module.exports = Object.assign || function (target, source) {
		var from;
		var keys;
		var to = ToObject(target);
	
		for (var s = 1; s < arguments.length; s++) {
			from = arguments[s];
			keys = Object.keys(Object(from));
	
			for (var i = 0; i < keys.length; i++) {
				to[keys[i]] = from[keys[i]];
			}
		}
	
		return to;
	};


/***/ },
/* 12 */
/*!*************************!*\
  !*** ./~/flux/index.js ***!
  \*************************/
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Copyright (c) 2014, Facebook, Inc.
	 * All rights reserved.
	 *
	 * This source code is licensed under the BSD-style license found in the
	 * LICENSE file in the root directory of this source tree. An additional grant
	 * of patent rights can be found in the PATENTS file in the same directory.
	 */
	
	module.exports.Dispatcher = __webpack_require__(/*! ./lib/Dispatcher */ 14)


/***/ },
/* 13 */
/*!******************************!*\
  !*** ./~/keymirror/index.js ***!
  \******************************/
/***/ function(module, exports, __webpack_require__) {

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
	 */
	
	"use strict";
	
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
	  if (!(obj instanceof Object && !Array.isArray(obj))) {
	    throw new Error('keyMirror(...): Argument must be an object.');
	  }
	  for (key in obj) {
	    if (!obj.hasOwnProperty(key)) {
	      continue;
	    }
	    ret[key] = key;
	  }
	  return ret;
	};
	
	module.exports = keyMirror;


/***/ },
/* 14 */
/*!**********************************!*\
  !*** ./~/flux/lib/Dispatcher.js ***!
  \**********************************/
/***/ function(module, exports, __webpack_require__) {

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
	
	"use strict";
	
	var invariant = __webpack_require__(/*! ./invariant */ 15);
	
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
	 *   flightDispatcher.register(function(payload) {
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
	 *     flightDispatcher.register(function(payload) {
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
	
	  function Dispatcher() {
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
	  Dispatcher.prototype.register=function(callback) {
	    var id = _prefix + _lastID++;
	    this.$Dispatcher_callbacks[id] = callback;
	    return id;
	  };
	
	  /**
	   * Removes a callback based on its token.
	   *
	   * @param {string} id
	   */
	  Dispatcher.prototype.unregister=function(id) {
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
	  Dispatcher.prototype.waitFor=function(ids) {
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
	  Dispatcher.prototype.dispatch=function(payload) {
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
	  Dispatcher.prototype.isDispatching=function() {
	    return this.$Dispatcher_isDispatching;
	  };
	
	  /**
	   * Call the callback stored with the given id. Also do some internal
	   * bookkeeping.
	   *
	   * @param {string} id
	   * @internal
	   */
	  Dispatcher.prototype.$Dispatcher_invokeCallback=function(id) {
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
	  Dispatcher.prototype.$Dispatcher_startDispatching=function(payload) {
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
	  Dispatcher.prototype.$Dispatcher_stopDispatching=function() {
	    this.$Dispatcher_pendingPayload = null;
	    this.$Dispatcher_isDispatching = false;
	  };
	
	
	module.exports = Dispatcher;


/***/ },
/* 15 */
/*!*********************************!*\
  !*** ./~/flux/lib/invariant.js ***!
  \*********************************/
/***/ function(module, exports, __webpack_require__) {

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


/***/ }
/******/ ])
//# sourceMappingURL=bundle.js.map