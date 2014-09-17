
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

