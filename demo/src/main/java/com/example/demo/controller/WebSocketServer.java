package com.example.demo.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.websocket.*;
import javax.websocket.server.PathParam;
import javax.websocket.server.ServerEndpoint;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * WebSocket服务
 */
@RestController
@RequestMapping("websocket")
@ServerEndpoint(value = "/websocket/{username}", configurator = MyEndpointConfigure.class)
public class WebSocketServer {

    /**
     * 聊天室后缀
     */
    private static final String CHAT_ROOM = "的聊天室";

    /**
     * 在线人数
     */
    private static int onlineCount = 0;

    /**
     * 我的群聊
     */
    private static int onlineGroupChatCount = 0;

    /**
     * 在线用户的Map集合，key：用户名，value：Session对象
     */
    private static Map<String, Session> sessionMap = new HashMap<>();

    /**
     * 群聊用户的Map集合，key：群聊，value：相应群聊Session用户集合: 用户名：session
     */
    private static Map<String, Map<String, Session>> sessionGroupMap = new HashMap<>();

    /**
     * 连接建立成功调用的方法
     */
    @OnOpen
    public void onOpen(Session session, @PathParam("username") String username) {
        //在webSocketMap新增上线用户
        sessionMap.put(username, session);

        //当用户重新登录时更新用户的Sesison
        for (Map<String, Session> sessionMap : sessionGroupMap.values()) {
            for (Map.Entry<String, Session> sessionEntry : sessionMap.entrySet()) {
                if (sessionEntry.getKey().equals(username)) {
                    sessionMap.put(username, session);
                }
            }
        }

        //在线人数加加
        onlineCount++;

        //通知除了自己之外的所有人
        sendOnlineCount(session, "{'type':'onlineCount','onlineCount':" + onlineCount + ",username:'" + username + "'}");
    }

    /**
     * 连接关闭调用的方法
     */
    @OnClose
    public void onClose(Session session) {
        //下线用户名
        String logoutUserName = "";

        //从webSocketMap删除下线用户
        for (Map.Entry<String, Session> entry : sessionMap.entrySet()) {
            if (entry.getValue() == session) {
                sessionMap.remove(entry.getKey());
                logoutUserName = entry.getKey();
                break;
            }
        }
        //在线人数减减
        onlineCount--;

        //通知除了自己之外的所有人
        sendOnlineCount(session, "{'type':'onlineCount','onlineCount':" + onlineCount + ",username:'" + logoutUserName + "'}");
    }

    /**
     * 登录
     */
    @RequestMapping("/login/{username}")
    public ModelAndView login(HttpServletRequest request, @PathVariable String username) {
        return new ModelAndView("socketChart.html", "username", username);
    }

    /**
     * 登出
     */
    @RequestMapping("/logout/{username}")
    public String loginOut(HttpServletRequest request, @PathVariable String username) {
        return "退出成功！";
    }

    /**
     * 获取在线用户
     */
    @RequestMapping("/getOnlineList")
    private List<String> getOnlineList(String username) {
        List<String> list = new ArrayList<String>();
        //遍历webSocketMap
        for (Map.Entry<String, Session> entry : sessionMap.entrySet()) {
            if (!entry.getKey().equals(username)) {
                list.add(entry.getKey());
            }
        }
        return list;
    }

    /**
     * 获取当前聊天室
     */
    @RequestMapping("/getOnlineGroupChatList")
    private List<String> getOnlineGroupChatList(String username) {
        List<String> list = new ArrayList<String>();
        for (Map.Entry<String, Map<String, Session>> groupEntry : sessionGroupMap.entrySet()) {
            for (String member : groupEntry.getValue().keySet()) {
                if (member.equals(username)) {
                    list.add(groupEntry.getKey());
                }
            }
        }
        return list;
    }

    /**
     * 通知除了自己之外的所有人
     */
    private void sendOnlineCount(Session session, String message) {
        for (Map.Entry<String, Session> entry : sessionMap.entrySet()) {
            try {
                if (entry.getValue() != session) {
                    entry.getValue().getBasicRemote().sendText(message);
                }
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }

    /**
     * 服务器接收到客户端消息时调用的方法
     */
    @OnMessage
    public void onMessage(String message, Session session) {
        try {
            //JSON字符串转 HashMap
            HashMap hashMap = new ObjectMapper().readValue(message, HashMap.class);

            //消息类型
            String type = (String) hashMap.get("type");

            //来源用户
            Map srcUser = (Map) hashMap.get("srcUser");

            //目标用户
            Map tarUser = (Map) hashMap.get("tarUser");

            //聊天室
            Map room = (Map) hashMap.get("roomName");

            //如果点击的是自己，那就是群聊
            if (srcUser.get("username").equals(tarUser.get("username"))) {
                //群聊
                groupChat(session, hashMap);
                return;
            }

            switch (type) {
                case CommConstants.PRIVATE_CHAT :
                    // 私聊
                    privateChat(session, tarUser, hashMap);
                    break;
                case CommConstants.ROOM_CHAT :
                    // 聊天室群聊
                    roomChat((String)tarUser.get("username"), hashMap, session);
                    break;
                case CommConstants.CREATE_ROOM_CHAT :
                    // 创建群聊
                    createRoom((String)srcUser.get("username"), (String)room.get("roomName"), session);
                    break;
                case CommConstants.ADD_USER_CHAT :
                    // 群聊新增成员
                    addMembers((String)tarUser.get("username"), (String)room.get("roomName"), session);
                    break;
                default:

            }

            //后期要做消息持久化

        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    /**
     * 私聊
     */
    private void privateChat(Session session, Map tarUser, HashMap hashMap) throws IOException {
        //获取目标用户的session
        Session tarUserSession = sessionMap.get(tarUser.get("username"));

        //如果不在线则发送“对方不在线”回来源用户
        if (tarUserSession == null) {
            session.getBasicRemote().sendText("{\"type\":\"0\",\"message\":\"对方不在线\"}");
        } else {
            hashMap.put("type", "1");
            tarUserSession.getBasicRemote().sendText(new ObjectMapper().writeValueAsString(hashMap));
        }
    }

    /**
     * 群聊
     */
    private void groupChat(Session session, HashMap hashMap) throws IOException {
        for (Map.Entry<String, Session> entry : sessionMap.entrySet()) {
            //自己就不用再发送消息了
            if (entry.getValue() != session) {
                hashMap.put("type", "2");
                entry.getValue().getBasicRemote().sendText(new ObjectMapper().writeValueAsString(hashMap));
            }
        }
    }

    /**
     * 聊天室聊天
     * @param userName
     * @param hashMap
     * @param session
     * @throws IOException
     */
    private void roomChat(String userName, HashMap hashMap, Session session) throws IOException {
        //获取当前需要聊天的聊天室成员集合
        Map<String, Session> sessions = sessionGroupMap.get(userName);
        try {
            for (Session see : sessions.values()) {
                if (!session.getPathParameters().get("username").equals(see.getPathParameters().get("username"))) {
                    hashMap.put("type", "3");
                    hashMap.put("roomName", userName);
                    see.getBasicRemote().sendText(new ObjectMapper().writeValueAsString(hashMap));
                }
            }
        } catch (Exception e) {
            System.out.println("当前用户" + session.getPathParameters().get("username") + "状态为：" + session.isOpen());
        }
    }

    /**
     * 创建房间
     * @param username
     * @param session
     */
    private void createRoom(String username, String roomName, Session session) {
        if (sessionGroupMap.get(username) == null) {
            Map<String, Session> sessions = new HashMap<>();
            sessions.put(username, session);
            sessionGroupMap.put(roomName, sessions);
        }
    }

    /**
     * 查询除当前用户外所有用户的用户名
     */
    @RequestMapping("/selectAllMembers")
    private List<String> selectAllMembers(String username) {
        List<String> memberList = new ArrayList<>();
        for (String name : sessionMap.keySet()) {
            if (!name.equals(username)) {
                memberList.add(name);
            }
        }
        return memberList;
    }

    /**
     * 添加群聊成员
     * @param roomName
     * @param memberName
     * @param session
     */
    private void addMembers(String memberName, String roomName, Session session) throws IOException {
        Map<String, Session> room = sessionGroupMap.get(roomName);
        Session memberSession = sessionMap.get(memberName);
        room.put(memberName, memberSession);
        HashMap hashMap = new HashMap();
        hashMap.put("type", CommConstants.ADD_USER_CHAT);
        hashMap.put("roomName", roomName);
        memberSession.getBasicRemote().sendText(new ObjectMapper().writeValueAsString(hashMap));
    }

    /**
     * 发生错误时调用
     */
    @OnError
    public void onError(Session session, Throwable error) {
        error.printStackTrace();
    }

}