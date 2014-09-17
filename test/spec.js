var should = require('should');

var data = require('../js/data/dialogData.js');
var users = require('../js/data/userData.js');


describe('data source should match the format', function(){
    it('dialog data should be a large obj', function(){
        (data).should.be.not.empty;
    });

    it('users data should be a large obj', function(){
        // console.log(users);
        (users).should.be.not.empty;
    });

    it('key应为数字', function(){
        for(var i in data){
            var item = data[i];
            // key应为数字
            isNaN(Number(i)).should.be.not.ok;
        }
    });

    it('user identifer 应该在user数据的集合中', function(){
        for(var i in data){
            var item = data[i];
            if( !valueAsKey(item.user, users)){
                console.log(item);
            }
            valueAsKey(item.user, users).should.be.ok;
        }
    });
    it('word should not be empty', function(){
        for(var i in data){
            var item = data[i];
            // word should not be empty
            Boolean(item.word).should.be.ok;
        }
    });
    it('dur should be bigger than 0', function(){
        for(var i in data){
            var item = data[i];
            (item.dur).should.be.greaterThan(0);
        }
    });
    it('and maybe less than 3000', function(){
        for(var i in data){
            var item = data[i];
            // console.log(item.dur);
            (item.dur).should.be.lessThan(3000);
        }
    });
    
});


function valueAsKey(val, obj){
    for(var i in obj){
        if(val == i){
            return true;
        }
    }
    return false;
}