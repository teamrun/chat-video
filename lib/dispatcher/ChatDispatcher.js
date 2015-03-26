var Dispatcher = require('flux').Dispatcher;

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