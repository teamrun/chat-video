

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