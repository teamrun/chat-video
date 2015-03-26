var ChatList = require('./components/ChatList.react.js');
var MovieCtrl = require('./components/Movie.js');


// React.renderComponent
var ctn = $('#msg-module .list-ctn').get(0);

React.render(<ChatList scrollEle="#msg-module .scroll-wrapper" scrollCtn="#msg-module" />, ctn);


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