Chat = function(container,user,token) {
  var message_store = [];
  var self = this;
  self.ws = null;
  self.hidden = false;
  self.user = user;
  self.uuid = "";
  self.token = token;
  self.channel = "Public";
  self.channelList = [];
  var msgbox = document.getElementById(container);
  if(msgbox == null){
    console.error("message box can't not be find.");
    return;
  }
  msgbox.className = "messagebox";

  Chat.prototype.CreateMessage = function(channel,message) {
      var msg = {
        user: self.user,
        type:"message",
        timestamp: new Date().getTime(),
        channel:channel,
        message:message,
        uuid:self.uuid,
        token:self.token,
        data:{}
      };
      return msg;
  }

  Chat.prototype.Add = function(message) {
    message_store.push(message);
    self.Render();
  }

  Chat.prototype.Init = function() {
    var oldresize = window.onresize;
    console.log(oldresize);
    if (typeof oldresize !== 'function' || oldresize == null) {
        window.onresize = self.BoardRender;
    } else {
        window.onresize = function() {
            oldresize();
            self.BoardRender;
        }
    }
    self.BoardRender();
  }
  Chat.prototype.BoardRender = function() {
    msgbox.innerHTML = '<div id="message_setting" class="message_setting"><label>'+self.user+'</label>'+
    '<button id="switch_btn"> '+((self.hidden)?"+":"-")+' </button>'+
    '</div>';
    if(!self.hidden){
      msgbox.innerHTML += '<div id="message_ctx" class="message_ctx"></div>'+
      '<hr class="hr_line"></hr>'+
      '<div class="inputbox"><input type="text" size="20" name="send_box" id="send_box" placeholder="Your message">'+
      '<button type="button" id="send_btn" name="send_btn">Send</button></div>';
      document.getElementById("send_btn").addEventListener("click", self.Send);
      document.getElementById("send_box").addEventListener("keyup", self.Change);
    }

    document.getElementById("switch_btn").addEventListener("click", self.SwitchWindow);
    msgbox.style.top = window.innerHeight - msgbox.offsetHeight - 4 + 'px';
    msgbox.style.left = window.innerWidth - msgbox.offsetWidth - 4 + 'px';

    self.Render();
  }

  Chat.prototype.SwitchWindow = function() {
    self.hidden = (self.hidden)?false:true;
    if(self.hidden){
      msgbox.style.height = "26px";
    } else {
      msgbox.style.height = "300px";
    }
    self.BoardRender();
  }

  Chat.prototype.Render = function() {
    if(!self.hidden){
      var msg_ctx = "";
      for(idx in message_store) {
        msg_ctx += self.RenderMessage(message_store[idx]);
      }
      var msg_ctx_box = document.getElementById('message_ctx');
      msg_ctx_box.innerHTML = msg_ctx;
      msg_ctx_box.scrollTop = msg_ctx_box.scrollHeight
    }
  }

  Chat.prototype.RenderMessage = function(msg) {
    if(msg.message.indexOf("<script>") != -1 || msg.message.indexOf("</script>") != -1){
      msg.message = "XSS Injection. Auto block by goChat.";
    }
    msg_ctx = '<div class="message">'+
               '<div class="message_title" style="'+((msg.user == self.user)?"background-color: #b0ff7b;":"background-color: #c6f104;")+'"><b>'+msg.user+'</b>';
               today = DateConverter(new Date().getTime());
               msgDay = DateConverter(msg.timestamp);
    msg_ctx += ' to <b>'+ msg.channel +'</b>';
    msg_ctx += '<label>'+((today == msgDay)?"today":timeConverter(msg.timestamp))+'</label></div>'+
               '<div class="message_content"><b>'+msg.message+'</div></div>';
    return msg_ctx;
  }

  Chat.prototype.Connect = function(url) {
    self.ws = new WebSocket(url);
    self.ws.onopen = self.onOpen;
    self.ws.onmessage = self.onMessage;
    self.ws.onerror = self.onError;
    self.ws.onclose = self.onClose;
  }
  Chat.prototype.onOpen = function(event) {
    console.log("onOpen:",event);
    if(self.ws != null && self.ws.readyState == self.ws.OPEN) {
      var msg = self.CreateMessage(self.channel, "login");
      msg.type = "login";
      self.ws.send(JSON.stringify(msg));
    }
  }
  Chat.prototype.onMessage = function(event) {
    console.log("onMessage:",event);
    if(event.data != ""){
      var msg = JSON.parse(event.data);
      if(msg != null){
        console.log("receive Message:",msg);
        switch(msg.type){
          case "login":
            self.uuid = msg.data.args[0];
          break;
        }
        self.Add(msg);
      }
    }
  }
  Chat.prototype.onClose = function(event) {
    console.log("onClose:",event);
    var msg = self.CreateMessage("Public","GoChat Service has shutdown. Please refresh page.");
    msg.user = "GoChat Service";
    message_store.push(msg);
    self.BoardRender();

  }
  Chat.prototype.onError = function(event) {
    console.log("onError:",event);
  }

  Chat.prototype.Change = function(event) {
    var unicode = -1;
  	if(event != null){
  		unicode=event.keyCode? event.keyCode : event.charCode;
  	}
  	var message = document.getElementById("send_box").value;
  	if(message != ""){
      if(unicode == 13 || event == null){
  		    self.Send();
    	}
    }
  }

  Chat.prototype.Send = function() {
    var message = document.getElementById('send_box').value;
    console.log("Send",self.channel);
    var msg = self.CreateMessage(self.channel, message);
    if(self.ws != null && self.ws.readyState == self.ws.OPEN) {
      var send = true;
      var check = msg.message.substr(0,1);
      switch (check) {
        case "/":
        data = msg.message.substr(1).split(" ");
        if(data.length > 0 && data[0] != ""){
          switch(data[0]){
            case "change":
              self.channel = data[1];
              send = false;
            break;
            case "join":
              for(idx in self.channelList){
                channel = self.channelList[idx];
                if(channel == data[1]){
                  find = true;
                  break;
                }
              }
              if(!find){
                self.channelList.push(data[1]);
              }
            break;
            case "leave":
              for(idx in self.channelList){
                channel = self.channelList[idx];
                if(channel == data[1]){
                  delete(self.channelList[idx]);
                  break;
                }
              }
            break;
          }
          msg.type = "command";
          msg.data = {
            command:data[0],
            args:data
          }
        } else {
          send = false;
          msg = self.CreateMessage(self.channel,"message can't send. reason:command format incorrect.");
        }
          break;
        case "@":
        submsg = msg.message.substr(1);
        data = submsg.split(" ");
        console.log(data);
        if(data.length > 0 && data[0] != ""){
          var msgData = [];
          msgData.push(data[0]);
          delete(data[0]);
          msgData.push("");
          for(var i = 0;i < data.length;i++){
            if(typeof(data[i]) != "undefined") {
              if(msgData[1] == ""){
                msgData[1] += data[i];
              } else
                msgData[1] +=" " +data[i];
            }
          }
          msg.type = "direct";
          msg.message = msgData[1];
          msg.channel = msgData[0];
          msg.data = {
            command:"direct",
            args:msgData
          }
        }

        break;
        default:

      }
      if(send)
        self.ws.send(JSON.stringify(msg));
    } else {
      msg = self.CreateMessage(self.channel,"message can't send. reason:no connection can used.");
    }
    document.getElementById('send_box').value = "";
    self.Add(msg);
  }

  Chat.prototype.Status = function() {
    switch(self.ws.readyState){
      case self.ws.OPEN:
        return true;
    }
    return false;
  }
  self.Init();
}
