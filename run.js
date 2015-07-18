require('./lib/jquery.facedetection.js');
cv = require('opencv');
imageClient = require('google-images');
var Slack = require('node-slack-upload');
fs = require('fs');
path = require('path');
var uuid = require('node-uuid');
var nodeImages = require("images");
var http = require('http');
var https = require('https');
var commands = require("./commands.js")

var pbotConfig = JSON.parse(fs.readFileSync('./pbot.json', 'utf8'));

var WebSocket = require('ws'),
    apiToken = process.env.PBOT_APITOKEN || pbotConfig.apiToken,
    authUrl = "https://slack.com/api/rtm.start?token=" + apiToken,
    request = require("request"),
    userId = process.env.PBOT_USER_ID || pbotConfig.userId;

var slack = new Slack(apiToken);

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

      if (message.type === 'message') {

        // command : param 
        var args = /(\w*)\s*\:(.*)/.exec(message.text)
        var command = null
        var commandArgs = []
        if (args) {
          console.log("ARGS -> " + args)
          var commandName = args[1].trim()
          commandArgs = args[2].split("+")
          command = commands[commandName]
        }
        else if (message.text) {
          // command (?)
          command = commands[message.text.trim().replace(/\?/,'')]
        }
        if (command) {
          command.execute(commandArgs, function (response) {
            var text = "@bot: " + (response.text || "")
            if (response.attachment) {
              uploadAttachment(response.attachment, function (attachment) {
                if (text.indexOf("{link}") >= 0) {
                  text = text.replace("{link}", attachment.url)
                }
                else {
                  text += " " + attachment.url
                }
                sendMessage(ws, message, text)
              })
            }
            else if (response.text) {
              sendMessage(ws, message, text)
            }
          })
        }
      }    
  });
}

function uploadAttachment(outputFileName, then) {
    console.log("Uploading new image " + outputFileName + " ...");
    var url
    if (outputFileName.indexOf("http") === 0) {
        url = outputFileName
    }
    else {
        var fileName = outputFileName.substring(outputFileName.lastIndexOf('/') + 1)
        url = pbotConfig.attachmentBaseUrl + fileName
    }
    then({ url: url })
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

 function sendMessage(ws, message, text) {
    ws.send(JSON.stringify({ 
        channel: message.channel, 
        id: 1,
        text: text,
        type: "message",
        reply_to : message.id
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
