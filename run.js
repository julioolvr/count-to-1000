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

      if (isFaceUpload(message)) {
          controller.uploadFace(message, ws)
      }

      if (message.type === 'message') {

        // command : param 
        var args = /(\w*)\s*\:(.*)/.exec(message.text)
        if (args) {
          console.log("ARGS -> " + args)
          var commandName = args[1].trim()
          var handler = controller[commandName]
          if (handler)
            handler(message, ws, args[2].trim())
        }
        else if (message.text) {
          // command (?)
          var handler = controller[message.text.trim().replace(/\?/,'')]
          if (handler) {
            handler(message, ws)
          }
          // else {
            // sendMessage(ws, message, "Ups, no entiendo '" + message.text + "'")
          // }
        }
      }    
  });
}

var uploadRegExp = /^uploadFace\:.*/

function isFaceUpload(message) {
  return (message.type === "file_created" ||
          message.type === "file_shared" ) && message.file.title.match(uploadRegExp)
}

Controller = function() {
  this.uploadFace = function(message, ws) {
    var guyName = message.file.title.substring(message.file.title.indexOf(':') + 1)
    console.log("uploading guyName: " + guyName)

    var extension = message.file.permalink_public.substring(message.file.permalink_public.lastIndexOf('.') + 1)
    var image = downloadImage(message.file.permalink_public, "./faces/" + guyName + extension, function() {
      sendDirectMessage(ws, message.file.user, "@bot: Gracias capo ! Ya podes usar la cara de " + guyName)
    })
  }

  this.hola = function(message, ws) {
    sendMessage(ws, message, "@bot: Hola che !")
  }

  this.chau = function(message, ws) {
    sendMessage(ws, message, "@bot: Chau che !")
  }

  this.gimage = function(message, ws) {
    gimage(message, ws)
  }

  this.gimages = function(message, ws) {
    gimages(message, ws)
  }

  this.face = function(message, ws, texto) {
    face(message, ws, texto)
  }

  this.combine = function(message, ws) {
    combineWith(message.text.substring(message.text.indexOf(':') + 1).trim(), message, ws)
  }

  this.names = function(message, ws) {
    names(message, ws)
  }

}
var controller = new Controller()


 function combineWith(searching, message, ws) {
    guys = searching.substring(0, searching.indexOf('+')).split('\&amp;')
    imageUrl = searching.substring(searching.indexOf('+') + 2, searching.length - 1)

    var localFile = computeTemporaryImageFileName(imageUrl)
    downloadImage(imageUrl, localFile, function() {
      addCircleToFace(guys, localFile, function() {faceNotFound(ws, message)}, function(outputFileName) {
        upload(outputFileName, message, ws)
      })
    })
 }

 function faceNotFound(ws, message) {
    sendMessage(ws, message, "@bot: No encontré una imagen con cara :(")
 }

 function downloadImage(url, fileName, then) {
  console.log('Downloading ' + url + " to file" + fileName)
  var file = fs.createWriteStream(fileName);
  var client = url.match(/^https.*/) ? https : http
  var request = client.get(url, function(response) {
    response.pipe(file);
    response.on('end', then);
  });
 }

 function names(message, ws) {
    sendMessage(ws, message, '@bot: Me banco a: ' + fs.readdirSync('./faces').map(function(name) {
      return name.substring(0, name.indexOf('.'))
    }).join(', '));
 }

 function face(message, ws, searching) {
    var guys = ["soto"]
    if (searching.indexOf('+') > 0) {
      guys = searching.substring(0, searching.indexOf('+')).split('\&amp;')
      searching = searching.substring(searching.indexOf('+') + 1)
    }
    combineFace(searching, message, ws, guys);
 }

 function combineFace(searching, message, ws, guys) {
    console.log("Combining face for " + guys);
    findImages(searching, function(images) {  
      var i = 0;
      var next = function() {
        i++
        if (images.length > i) {
          console.log("Trying next image " + i);
          cutFaceAndSend(guys, images[i], message, ws, next)
        }
        else
          sendMessage(ws, message, "@bot: No encontré una imagen con cara para bardear a '" + guys + "' con '" + searching + "'")
      }

      cutFaceAndSend(guys, images[i], message, ws, next);
    })
 }

 function cutFaceAndSend(guys, image, message, ws, nextIfNoFace) {
    console.log("Processing image " + image.url + " for " + guys);
    var fileName = computeTemporaryImageFileName(image.url)

    console.log("Writing image to " + fileName);
    image.writeTo(fileName, function() {
      addCircleToFace(guys, fileName, nextIfNoFace, function(outputFileName) {
        upload(outputFileName, message, ws)
      })
    })
 }

 function computeTemporaryImageFileName(imageUrl) {
    var fileExtension = imageUrl.substring(imageUrl.lastIndexOf('.') + 1);
    return "./tmp/" + uuid.v4() + (fileExtension.length > 4 ? ".tmp" : ("." + fileExtension));
 }

 function upload(outputFileName, message, ws) {
    console.log("Uploading new image " + outputFileName + " ...");
  
    slack.uploadFile({
        file: fs.createReadStream(path.join(__dirname, '.', outputFileName)),
        title: outputFileName,
        initialComment: "@bot: Phothoshoped <" + message.text + ">",
        channels: message.channel
    }, function(err) {
        if (err) {
            console.error(err);
        }
        else {
            console.log('done');
        }
        console.log("Deleting temporary images..");
        // fs.unlinkSync(fileName);
        // fs.unlinkSync(outputFileName);
    });
 }

 function addCircleToFace(guys, fileName, nextIfNoFace, andThen) {
      cv.readImage(fileName, function(err, im) {
          console.log("Manipulating images " + fileName + " for " + guys);

          try {
            im.detectObject(cv.FACE_CASCADE, {}, function(err, faces) {
              if (err) {
                nextIfNoFace()
              }
              if (faces.length == 0) {
                nextIfNoFace()
              }
              else {
                processFaces(guys, fileName, faces, andThen)
              }
            });
          }
          catch (error) {
            console.log("Error manipulating image " + fileName);
            nextIfNoFace()
          }
      })
 }

 function processFaces(guys, fileName, faces, andThen) {
    var ima = nodeImages(fileName);
    var faceImages = guys.map(function(guy) { return nodeImages("./faces/" + guy + ".png") });

    var resizeFactor = 0.1
    var i = 0;
    faces.forEach(function(face) {
      i = i % guys.length
      var faceImage = faceImages[i++];
      var resized = faceImage.size(face.width * (1 + resizeFactor), face.height * (1+resizeFactor))
      ima.draw(resized, face.x - (face.width*resizeFactor/2), face.y - (face.width*resizeFactor/2))
    })

    var outputFileName = fileName.substring(0, fileName.lastIndexOf('.')) + "-out" + fileName.substring(fileName.lastIndexOf('.'));
    console.log("Saving temporary image " + outputFileName + "...");

    ima.save(outputFileName)
    andThen(outputFileName);
 }

 function gimage(message, ws) {
    findAndSendImages(message, ws, filterOne)
 }

 function gimages(message, ws) {
    findAndSendImages(message, ws, filterNone)
 }

 function filterOne(images) { return [images[Math.floor(Math.random()*images.length)]] }
 function filterNone(images) { return images }

 function findAndSendImages(message, ws, filtering) {
    var searching = message.text.substring(message.text.indexOf(':') + 1);
    findImages(searching, function(images) {
      filtering(images).forEach(function(image) {
          sendMessage(ws, message, image.url)
        }
      )
    })
 }

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

 function findImages(searching, command) {
    console.log('Searching image for :', searching);
    imageClient.search({ 'for': searching, callback : function(err, images) {
        console.log('Found ' + images.length + ' images');
        command(images)
    }})
 }

