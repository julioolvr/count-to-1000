var fs = require('fs')
var commands = require("./commands.js")
var path = require('path')
var activeCommands = 0
var resetWhenIdle = false
var SlackUpload = require('node-slack-upload');
commands.resetBot = {
    private: true,
    help: {
        description: "reinicia el bot",
        params: ["pass"],
        helpParams: {
            pass: "la contraseña"
        }
    },
    execute: function(params, then) {
        if (params.length < 1) {
            then({ success: false, text: "Falta contraseña" })
        }
        else if (params[0].trim() === pbotConfig.adminPassword) {
            resetWhenIdle = true
            then({ success: true, text: "Reset programado :)" })
        }
        else {
            then({ success: false, text: "Password inválida" })
        }
    }
}

commands.help.configure("uso command:[param1]+[param2]+...", function (commandName, description, params, command) {
    var note = ""
    if (command.private) {
        note = " (solo mensaje privado)"
    }
    return "`" + commandName + "`: " + description + note + "\n" + params + "\n"
}, function (paramName, description) {
    return "        `" + paramName + "` " + description + "\n"
})

var pbotConfig = JSON.parse(fs.readFileSync('./pbot.json', 'utf8'));

var WebSocket = require('ws'),
    apiToken = process.env.PBOT_APITOKEN || pbotConfig.apiToken,
    authUrl = "https://slack.com/api/rtm.start?token=" + apiToken,
    request = require("request");

request(authUrl, function(err, response, body) {
  if (!err && response.statusCode === 200) {
    var res = JSON.parse(body);
    if (res.ok) {
      connectWebSocket(res.url);
    }
  }
});

function connectWebSocket(url) {
  var ws = new WebSocket(url);

  ws.on('open', function() {
      console.log('Connected');
  });

  ws.on('message', function(message) {
      console.log('Received: ', message);
      message = JSON.parse(message);

      //if (isFaceUpload(message)) {
      //    controller.uploadFace(message, ws)
      //}

      var command = null
      var commandArgs = []
      var args, commandName
      if (message.type === 'message') {
        var text = message.text
        if ("file_share" === message.subtype) {
            text = message.file.title
            text += (text.indexOf(":") != -1 ? "+" : ":") + message.file.url_download
        }
        // command : param 
        args = /(\w*)\s*\:(.*)/.exec(text)
        if (args) {
          console.log("ARGS -> " + args)
          commandName = args[1].trim()
          commandArgs = fn.splitSlackParams(args[2])
          command = commands[commandName]
        }
        else if (text) {
          // command (?)
          command = commands[text.trim().replace(/\?/,'')]
        }
      }
      if (command && availableForChannel(command, message.channel)) {
          sendStartTyping(ws, message)
          activeCommands++
          command.execute(commandArgs, function (response) {
            var end = function () {
              if (response.text) {
                sendMessage(ws, message.channel, text)
              }
              activeCommands--
              if (resetWhenIdle && activeCommands === 0) {
                ws.close()
              }
            }
            var text = "@bot: " + (response.text || "")
            if (response.attachments && response.attachments.length > 0) {
              var upload = function (i) {
                if (i === response.attachments.length) {
                  end()
                }
                else uploadAttachment(ws, response.attachments[i], message.channel, function () {
                  upload(i + 1)
                })
              }
              upload(0)
            }
            else {
              end()
            }
          })
      }    
  });
}

function uploadAttachment(ws, attachment, channelId, then) {
    console.log("Uploading new image " + attachment.file + " ...");
    var url
    if (attachment.file.indexOf("http") === 0) {
        url = attachment.file
    }
    else if (pbotConfig.upload) {
        uploadFile(attachment.file, attachment.text, channelId, then)
    }
    else {
        var fileName = attachment.file.substring(attachment.file.lastIndexOf('/') + 1)
        url = pbotConfig.attachmentBaseUrl + attachment.file
        sendMessage(ws, channelId, attachment.text)
    }
    if (url) {
        sendMessage(ws, channelId, attachment.text + ": " + url)
        then()
    }
}

function uploadFile(fileName, text, channelId, then) {
  var slackUpload = new SlackUpload(apiToken)
  slackUpload.uploadFile({
    file: fs.createReadStream(fileName),
    title: text,
    channels: channelId
  }, function (err) {
    console.log("done! ", err);
  });
}

var uploadRegExp = /^uploadFace\:.*/

function isFaceUpload(message) {
  return (message.type === "file_created" ||
          message.type === "file_shared" ) && message.file.title.match(uploadRegExp)
}

/* Not migrated yet
  this.uploadFace = function(message, ws) {
    var guyName = message.file.title.substring(message.file.title.indexOf(':') + 1)
    console.log("uploading guyName: " + guyName)

    var extension = message.file.permalink_public.substring(message.file.permalink_public.lastIndexOf('.') + 1)
    var image = downloadImage(message.file.permalink_public, "./faces/" + guyName + extension, function() {
      sendDirectMessage(ws, message.file.user, "@bot: Gracias capo ! Ya podes usar la cara de " + guyName)
    })
  }
*/

var _nextId = 1
function nextId() {
	return _nextId++
}

function availableForChannel(command, channel) {
    return !command.private || channel.substring(0, 1) === "D"
}

function sendStartTyping(ws, message) {
    ws.send(JSON.stringify({
        channel: message.channel,
        id: nextId(),
        type: "typing",
        reply_to : message.id
    }));
}

 function sendMessage(ws, channelId, text) {
    ws.send(JSON.stringify({ 
        channel: channelId,
        id: nextId(),
        text: text,
        type: "message"
    }));
 }

 function sendDirectMessage(ws, to, text) {
    ws.send(JSON.stringify({ 
        channel: to, 
        id: 1,
        text: text,
        type: "message"
    }));
 }
