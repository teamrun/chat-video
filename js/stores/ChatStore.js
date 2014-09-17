


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