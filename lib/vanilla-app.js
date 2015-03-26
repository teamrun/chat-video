// need data obj
 var data = {
    1: {
        alias: 'mark',
        avatar: '',
        words: 'i think i\'v come up somthing...',
        duration: 1
    },
    1.8: {
        alias: 'Wardo',
        words: 'that looks good, that looks really good.',
        duration: 3
    },
    5: {
        alias: 'mark',
        words: 'It\'s gonna be online in any second...',
        duration: 2
    },
    6: {
        alias: 'Dustin',
        words: 'who should we send to first?',
        duration: 1
    }
}
            
var DiaList = [];
function render(list){
    var htmlStr = '';
    list.forEach(function(item){
        htmlStr += '<li>';
        htmlStr += '<span>' + item.alias + '</span>';
        htmlStr += ': ';
        htmlStr += '<span>' + item.words + '</span>';
        htmlStr += '</li>';
    });
    $('#ctn').html(htmlStr);
}


function show(data){
    for( var i in data){
        (function(index){
            setTimeout(function(){
                var str = data[index].words;
                data[index].words = '';
                DiaList.push( data[index] );
                render(DiaList);

                // console.log('gonna type:', str);
                // typeWords(str.substr(0,10), data[index].duration, 0, function(partial){
                //     console.log( partial );
                //     // DiaList[]
                // });
                (function(str, dur, offset, obj){
                    typeWords(str, data[index].duration, 0, function(partial){
                        obj.words = partial;
                        render(DiaList);
                    });
                })(str, data[index].duration, Number(index)*1000, data[index]);
            }, Number(index)*1000)
        })(i);
    }
}


// var str = 'node-os is the first operating system powered by npm';
// var dur = 2;
// setTimeout(function(){
//     typeWords(str, dur, 0, function(partial){
//         $('#test').html( partial );
//     });
// }, 1000);

function typeWords(words, dur, offSet, callback){
    if(!offSet){
        offSet = 0;
    }
    var arr = words.split('');

    arr.forEach(function(el, i){
        (function(index){
            callback( words.substr(0, 1) );
            setTimeout(function(){
                callback(words.substr(0, index+1));
            }, (dur*1000*(index+1)/arr.length) + offSet*1000);
            
        })(i);
    });
}
           

show(data);


// $('audio').on('play', function(){
//     setTimeout( function(){
//         show(data);
//     }, 1400);
// })


