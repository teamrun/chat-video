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