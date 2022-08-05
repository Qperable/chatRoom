//消息对象数组
var msgObjArr = new Array();

var websocket = null;

//判断当前浏览器是否支持WebSocket， springboot是项目名
if ('WebSocket' in window) {
    websocket = new WebSocket("ws://localhost:8080/websocket/"+username);
} else {
    console.error("不支持WebSocket");
}

//连接发生错误的回调方法
websocket.onerror = function (e) {
    console.error("WebSocket连接发生错误");
};

//连接成功建立的回调方法
websocket.onopen = function () {
    //获取所有在线用户
    $.ajax({
        type: 'post',
        url: ctx + "/websocket/getOnlineList",
        contentType: 'application/json;charset=utf-8',
        dataType: 'json',
        data: {username:username},
        success: function (data) {
            if (data.length) {
                //列表
                for (var i = 0; i < data.length; i++) {
                    var userName = data[i];
                    $("#hz-group-body").append("<div class=\"hz-group-list\"><span class='hz-group-list-username'>" + userName + "</span><span id=\"" + userName + "-status\">[在线]</span><div id=\"hz-badge-" + userName + "\" class='hz-badge'>0</div></div>");
                }

                //在线人数
                $("#onlineCount").text(data.length);
            }
        },
        error: function (xhr, status, error) {
            console.log("ajax错误！");
        }
    });

    //获取用户所有群聊
    $.ajax({
        type: 'post',
        url: ctx + "/websocket/getOnlineGroupChatList",
        data: {username:$("#talks").text()},
        success: function (data) {
            for (let i = 0; i < data.length; i++) {
                $("#hz-group-body").append("<div class=\"hz-group-list\">" +
                    "<span class='hz-group-list-username'>" + data[i] + "</span>" +
                    "<span id=\"" + data[i] + "-status\">[我的群聊]</span>" +
                    "<div id=\"hz-badge-" + data[i] + "\" class='hz-badge'>0</div>" +
                    "</div>");
            }

            //在线人数
            $("#onlineGroupChatCount").text(data.length);
        },
        error: function (xhr, status, error) {
            console.log("ajax错误！");
        }
    });
}

// 创建群聊
function groupChat(){
    var result = confirm("是否创建群聊");
    var userName = $("#talks").text();
    var roomName = $("#talks").text()+"的聊天室";
    var date = NowTime();
    if (result == true) {
        alert("正在创建群聊,请稍候");
        websocket.send(JSON.stringify({
            "type": "4",
            "tarUser": {"username": ""},
            "srcUser": {"username": userName},
            "roomName": {"roomName": roomName},
            "message": "",
            "date": date
        }));
        alert("群聊创建成功!房间号为" + roomName);
        $("#hz-group-body").append(
            "<div class=\"hz-group-list\">" +
            "<span class='hz-group-list-username'>" + roomName + "</span>" +
            "<span id=\"" + roomName + "-status\">[我的群聊]</span>" +
            "<div id=\"hz-badge-" + roomName + "\" class='hz-badge'>0</div>" +
            "</div>");
        $("#toUserName").text(roomName);
    } else {
        alert("取消创建群聊成功");
    }
}

// 获取除当前用户外所有成员，用于新增
function selectMember() {
    //获取当前所有用户名
    $.ajax({
        type: 'post',
        url: ctx + "/websocket/selectAllMembers",
        data: {username: $("#talks").text()},
        success: function (data) {
            $(".needDelete").remove();
            for (let i = 0; i < data.length; i++) {
                var memberName = data[i];
                $("#insertMember").append(
                    "<option value=\"" + memberName + "\" class='needDelete'>" + data[i] + "</option>"
                );
            }
        },
        error: function (xhr, status, error) {
            console.log("ajax错误！");
        }
    });
}

// 添加下拉框点击事件 新增群聊成员
$("#insertMember").on("change",function(){
    var roomName = $("#toUserName").text();
    if (roomName === "") {
        alert("请先选择聊天室");
        return;
    }
    var memberName = $("#insertMember").val();
    var date = NowTime;
    websocket.send(JSON.stringify({
        "type": "5",
        "tarUser": {"username": memberName},
        "srcUser": {"username": ""},
        "roomName": {"roomName": roomName},
        "message": "",
        "date": date
    }));
});


//接收到消息的回调方法
websocket.onmessage = function (event) {
    var messageJson = eval("(" + event.data + ")");

    //普通消息(私聊)
    if (messageJson.type === "1") {
        //来源用户
        var srcUser = messageJson.srcUser;
        //目标用户
        var tarUser = messageJson.tarUser;
        //消息
        var message = messageJson.message;

        //追加聊天数据
        setMessageInnerHTML(srcUser.username, srcUser.username, message);
    }

    //普通消息(群聊)
    if (messageJson.type === "2"){
        //来源用户
        var srcUser = messageJson.srcUser;
        //目标用户
        var tarUser = messageJson.tarUser;
        //消息
        var message = messageJson.message;

        //追加聊天数据
        setMessageInnerHTML(username, tarUser.username, message);
    }

    //普通消息(聊天室群聊)
    if (messageJson.type === "3"){
        //来源用户
        var srcUser = messageJson.srcUser;
        //目标用户
        var tarUser = messageJson.tarUser;
        //聊天室
        var roomName = messageJson.roomName;
        //消息
        var message = messageJson.message;

        //追加聊天数据
        setMessageInnerHTML(roomName, srcUser.username, message);
    }

    // 添加群聊成员
    if (messageJson.type === "5") {
        var roomName = messageJson.roomName;
        $("#hz-group-body").append("<div class=\"hz-group-list\">" +
            "<span class='hz-group-list-username'>" + roomName + "</span>" +
            "<span id=\"" + roomName + "-status\">[我的群聊]</span>" +
            "<div id=\"hz-badge-" + roomName + "\" class='hz-badge'>0</div>" +
            "</div>");
        alert("欢迎加入" + roomName + "!");
    }

    //对方不在线
    if (messageJson.type == "0"){
        //消息
        var message = messageJson.message;

        $("#hz-message-body").append(
            "<div class=\"hz-message-list\" style='text-align: center;'>" +
            "<div class=\"hz-message-list-text\">" +
            "<span>" + message + "</span>" +
            "</div>" +
            "</div>");
    }

    //在线人数
    if (messageJson.type == "onlineCount") {
        //取出username
        var onlineCount = messageJson.onlineCount;
        var userName = messageJson.username;
        var oldOnlineCount = $("#onlineCount").text();

        //新旧在线人数对比
        if (oldOnlineCount < onlineCount) {
            if($("#" + userName + "-status").length > 0){
                $("#" + userName + "-status").text("[在线]");
            }else{
                $("#hz-group-body").append(
                    "<div class=\"hz-group-list\">" +
                    "<span class='hz-group-list-username'>" + userName + "</span>" +
                    "<span id=\"" + userName + "-status\">[在线]</span>" +
                    "<div id=\"hz-badge-" + userName + "\" class='hz-badge'>0</div>" +
                    "</div>");
            }
        } else {
            //有人下线
            $("#" + userName + "-status").text("[离线]");
        }
        $("#onlineCount").text(onlineCount);
    }

}

//连接关闭的回调方法
websocket.onclose = function () {
    //alert("WebSocket连接关闭");
}

/**
 * 将消息显示在对应聊天窗口
 * 此处应该有三个名称：消息发起者、消息接受者和聊天框
 * @param msgUserName 源用户名称
 * @param chatBar  聊天框名称
 * @param message  消息内容
 */
function setMessageInnerHTML(chatBar, msgUserName, message) {
    //判断
    var childrens = $("#hz-group-body").children(".hz-group-list");
    //消息发送方是否在当前页面存在
    var isExist = false;
    for (var i = 0; i < childrens.length; i++) {
        var text = $(childrens[i]).find(".hz-group-list-username").text();
        if (text === chatBar) {
            isExist = true;
            break;
        }
    }
    if (isExist) {
        //如果该用户消息存在，则在已有基础上新增一条
        var isExist = false;
        for (var i = 0; i < msgObjArr.length; i++) {
            var obj = msgObjArr[i];
            if (obj.toUserName === chatBar) {
                //保存最新数据
                obj.message.push({username: msgUserName, message: message, date: NowTime()});
                isExist = true;
                break;
            }
        }
        if (!isExist) {
            //追加聊天对象
            msgObjArr.push({
                toUserName: chatBar,
                message: [{username: msgUserName, message: message, date: NowTime()}]//封装数据
            });
        }
    } else {
        //追加聊天对象
        msgObjArr.push({
            toUserName: chatBar,
            message: [{username: msgUserName, message: message, date: NowTime()}]//封装数据
        });
        $("#hz-group-body").append(
            "<div class=\"hz-group-list\">" +
            "<span class='hz-group-list-username'>" + chatBar + "</span>" +
            "<span id=\"" + chatBar + "-status\">[在线]</span>" +
            "<div id=\"hz-badge-" + chatBar + "\" class='hz-badge'>0</div>" +
            "</div>"
        );
    }

    // 对于接收消息来说这里的toUserName就是来源用户，对于发送来说则相反
    var username = $("#toUserName").text();

    //刚好打开的是对应的聊天页面
    if (chatBar === username) {
        $("#hz-message-body").append(
            "<div class=\"hz-message-list\">" +
            "<p class='hz-message-list-username'>"+msgUserName+"：</p>" +
            "<div class=\"hz-message-list-text left\">" +
            "<span>" + message + "</span>" +
            "</div>" +
            "<div style=\" clear: both; \"></div>" +
            "</div>");
    } else {
        //小圆点++
        var conut = $("#hz-badge-" + chatBar).text();
        $("#hz-badge-" + chatBar).text(parseInt(conut) + 1);
        $("#hz-badge-" + chatBar).css("opacity", "1");
    }
}

//发送消息
function send() {
    // 判断输入框是否为空 空直接跳出 空不能发送
    if (!$.trim($('#hz-message-input').html())) {
        alert("不能为空");
        return;
    }
    //消息
    var message = $("#hz-message-input").html();
    //目标用户名
    var tarUserName = $("#toUserName").text();
    // 时间
    var date = NowTime();
    //登录用户名
    var srcUserName = $("#talks").text();
    var type;
    if (tarUserName.endsWith("的聊天室")) {
        type = "3";
    } else {
        type = "1";
    }
    websocket.send(JSON.stringify({
        "type": type,
        "tarUser": {"username": tarUserName},
        "srcUser": {"username": srcUserName},
        "message": message,
        "date": date
    }));
    $("#hz-message-body").append(
        "<div class=\"hz-message-list\">" +
        "<div class=\"hz-message-list-text right\">" +
        "<span>" + message + "</span>" +
        "</div>" +
        "</div>");
    $("#hz-message-input").html("");
    //取出对象
    if (msgObjArr.length > 0) {
        var isExist = false;
        for (var i = 0; i < msgObjArr.length; i++) {
            var obj = msgObjArr[i];
            if (obj.toUserName == tarUserName) {
                //保存最新数据
                obj.message.push({username: srcUserName, message: message, date: NowTime()});
                isExist = true;
                break;
            }
        }
        if (!isExist) {
            //追加聊天对象
            msgObjArr.push({
                toUserName: tarUserName,//聊天框名
                message: [{username: srcUserName, message: message, date: NowTime()}]//封装数据[{username:huanzi,message:"你好，我是欢子！",date:2018-04-29 22:48:00}]
            });
        }
    } else {
        //追加聊天对象
        msgObjArr.push({
            toUserName: tarUserName,
            message: [{username: srcUserName, message: message, date: NowTime()}]//封装数据[{username:huanzi,message:"你好，我是欢子！",date:2018-04-29 22:48:00}]
        });
    }
}

//监听点击用户
$("body").on("click", ".hz-group-list", function () {
    $(".hz-group-list").css("background-color", "");
    $(this).css("background-color", "whitesmoke");
    $("#toUserName").text($(this).find(".hz-group-list-username").text());

    console.log($(this).find('span').eq(1).text());

    //清空旧数据，从对象中取出并追加
    $("#hz-message-body").empty();
    $("#hz-badge-" + $("#toUserName").text()).text("0");
    $("#hz-badge-" + $("#toUserName").text()).css("opacity", "0");
    if (msgObjArr.length > 0) {
        for (var i = 0; i < msgObjArr.length; i++) {
            var obj = msgObjArr[i];
            if (obj.toUserName == $("#toUserName").text()) {
                //追加数据
                var messageArr = obj.message;
                if (messageArr.length > 0) {
                    for (var j = 0; j < messageArr.length; j++) {
                        var msgObj = messageArr[j];
                        var leftOrRight = "left";
                        var message = msgObj.message;
                        //消息对象的消息发起者用户名
                        var msgUserName = msgObj.username;
                        //页面的当前聊天框对应的用户名
                        var toUserName = $("#toUserName").text();

                        /*//当聊天窗口与msgUserName的人相同，文字在左边（对方/其他人），否则在右边（自己）
                        if (msgUserName == toUserName) {
                            leftOrRight = "left";
                        }

                        //但是如果点击的是自己，群聊的逻辑就不太一样了 username对应的是当前登录的用户名
                        if (username == toUserName && msgUserName != toUserName) {
                            leftOrRight = "left";
                        }

                        if (username == toUserName && msgUserName == toUserName) {
                            leftOrRight = "right";
                        }*/

                        // 两行代码能搞定的事愣是写了一堆，差点没给我绕死
                        if (username === msgUserName) {
                            leftOrRight = "right";
                        }

                        var magUserName = leftOrRight == "left" ? "<p class='hz-message-list-username'>"+msgUserName+"：</p>" : "";

                        $("#hz-message-body").append(
                            "<div class=\"hz-message-list\">" +
                            magUserName+
                            "<div class=\"hz-message-list-text " + leftOrRight + "\">" +
                            "<span>" + message + "</span>" +
                            "</div>" +
                            "<div style=\" clear: both; \"></div>" +
                            "</div>");
                    }
                }
                break;
            }
        }
    }
});

//获取当前时间
function NowTime() {
    var time = new Date();
    var year = time.getFullYear();//获取年
    var month = time.getMonth() + 1;//或者月
    var day = time.getDate();//或者天
    var hour = time.getHours();//获取小时
    var minu = time.getMinutes();//获取分钟
    var second = time.getSeconds();//或者秒
    var data = year + "-";
    if (month < 10) {
        data += "0";
    }
    data += month + "-";
    if (day < 10) {
        data += "0"
    }
    data += day + " ";
    if (hour < 10) {
        data += "0"
    }
    data += hour + ":";
    if (minu < 10) {
        data += "0"
    }
    data += minu + ":";
    if (second < 10) {
        data += "0"
    }
    data += second;
    return data;
}