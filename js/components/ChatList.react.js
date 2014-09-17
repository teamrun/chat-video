/**
 * @jsx React.DOM
 */ 



var ChatStore = require('../stores/ChatStore.js')

var ChatWord = require('./ChatWord.react.js');

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

var ChatList = React.createClass({
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
            return <ChatWord item={item} key={i} />;
        });

        return (
            <ul id="msg-list">
                <ReactCSSTransitionGroup transitionName="msg-item">
                    {nodes}
                </ReactCSSTransitionGroup>
            </ul>
        );
    },
    _onChange: function(){
        this.setState( getAllData() )
    }
});

module.exports = ChatList;