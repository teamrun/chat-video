var EventEmitter = require('events').EventEmitter;
var merge = require('react/lib/merge');

var TmplDispatcher = require('../dispatcher/TmplDispatcher');
var TmplConstants = require('../constants/TmplConstants');

var CHANGE_EVENT = 'change';


var _datas = {
    // test datas...
    111: {
        id: 111,
        complete: false,
        text: '创建一个新的todo, 保存在_todos中'
    },
    222: {
        id: 222,
        complete: false,
        text: '更新一个todo, update传需要(部分)更新的内容'
    }
};

var _dataHandler = {
    create: function(){

    }
};

var TmplStore = merge(EventEmitter.prototype, {
    getAll: function(){
        return _datas;
    },
    isAllComplete: function(){
        for(var i in _datas){
            if(_datas[i].complete === false){
                return false;
            }
        }
        return true;
    },
    // 使用events模块EventEmmit对象的地方...
    // 看上去很简单, 应该可以自己实现吧, 抛弃又一个依赖库
    emitChange: function(){
        // 这个触发事件也会有更多种类吧~?
        // 现在只有单一的'change'事件
        this.emit(CHANGE_EVENT);
    },
    addChangeListener: function(callback){
        this.on(CHANGE_EVENT, callback)
    },
    removeChangeListener: function(callback){
        this.removeListener(CHANGE_EVENT, callback)
    }
});


// 在dispatcher 分发器上注册处理函数
// 针对不同的actionType调用不同的函数
// 最后统一做一次emitChange

// 注册更多的action handler: CRUD 
TmplDispatcher.register(function(payload){
    var action = payload.action;
    var text;

    switch(action.actionType){
        case TmplConstants.XX_CREATE:
            // text = action.text.trim();
            // if( text !== '' ){
            //     _dataHandler.create(text);
            // }
            break;
        default:
            console.log('no store handler registed on this action: ', action.actionType)
            break;
    }

    TmplStore.emitChange();

    return true;
});


module.exports = TmplStore;
