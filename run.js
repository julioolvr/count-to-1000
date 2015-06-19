require('./lib/jquery.facedetection.js');
cv = require('opencv');
imageClient = require('google-images');
var Slack = require('node-slack-upload');
fs = require('fs');
path = require('path');
var uuid = require('node-uuid');
var nodeImages = require("images");


var WebSocket = require('ws'),
    apiToken = "xoxp-2946387922-3415127354-6482117463-7484d4", //Api Token from https://api.slack.com/web (Authentication section)
    authUrl = "https://slack.com/api/rtm.start?token=" + apiToken,
    request = require("request"),
    userId = 'U03C73RAE'; // Id for the user the bot is posting as

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
      console.log('received:', message);
      message = JSON.parse(message);

      if (message.type === 'message') {
          var number = Number(message.text);

          // TODO: hacerlo dinamico que resuelva por el nombre del comando una function del módulo
            if (message.text && message.text.match(/^gimage\:.*/)) {
              gimage(message, ws)
            }
            else if (message.text && message.text.match(/^gimages\:.*/)) {
              gimages(message, ws)
            }
            else if (message.text && message.text.match(/^face\:.*/)) {
              face(message, ws)
            }
            else if (message.text && message.text.match(/^soto\:.*/)) {
              combineFace(message.text.substring(message.text.indexOf(':') + 1), message, ws, 'soto')
            }
            else if (message.text && message.text.match(/^names?/)) {
              names(message, ws)
            }
      }    
  });
}

 function names(message, ws) {
    sendMessage(ws, message, 'Available names: ' + fs.readdirSync('./faces').map(function(name) {
      return name.substring(0, name.indexOf('.'))
    }).join(', '));
 }

 function face(message, ws) {
    var searching = message.text.substring(message.text.indexOf(':') + 1);
    var guy = "soto"
    if (searching.indexOf('+') > 0) {
      guy = searching.substring(0, searching.indexOf('+'))
      searching = searching.substring(searching.indexOf('+') + 1)
    }
    combineFace(searching, message, ws, guy);
 }

 function combineFace(searching, message, ws, guy) {
    console.log("Combining face for " + guy);
    findImages(searching, function(images) {
      filterOne(images).forEach(function (image) {
          cutFaceAndSend(guy, image, message, ws)
        }
      )
    })
 }

 function cutFaceAndSend(guy, image, message, ws) {
    console.log("Processing image " + image.url + " for " + guy);
    var fileName = computeTemporaryImageFileName(image)

    console.log("Writing image to " + fileName);
    image.writeTo(fileName, function() {
      addCircleToFace(guy, fileName, function(outputFileName) {
        upload(outputFileName, message, ws)
      })
    })
 }

 function computeTemporaryImageFileName(image) {
    var fileExtension = image.url.substring(image.url.lastIndexOf('.') + 1);
    return "./tmp/" + uuid.v4() + (fileExtension.length > 4 ? ".tmp" : ("." + fileExtension));
 }

 function upload(outputFileName, message, ws) {
    console.log("Uploading new image " + outputFileName + " ...");
  
    slack.uploadFile({
        file: fs.createReadStream(path.join(__dirname, '.', outputFileName)),
        title: outputFileName,
        initialComment: "Phothoshoped <" + message.text + ">",
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

 function addCircleToFace(guy, fileName, andThen) {
    cv.readImage(fileName, function(err, im) {
        console.log("Manipulating images ...");

        im.detectObject(cv.FACE_CASCADE, {}, function(err, faces) {
          if (err) {
            console.log("Error detecting faces: " + err);
            throw err;
          }
          var ima = nodeImages(fileName);
          var faceImage = nodeImages("./faces/" + guy + ".png");

          var resizeFactor = 0.1
          faces.forEach(function(face) {
            var resized = faceImage.size(face.width * (1 + resizeFactor), face.height * (1+resizeFactor))
            ima.draw(resized, face.x - (face.width*resizeFactor/2), face.y - (face.width*resizeFactor/2))
          })

          var outputFileName = fileName.substring(0, fileName.lastIndexOf('.')) + "-out" + fileName.substring(fileName.lastIndexOf('.'));
          console.log("Saving temporary image " + outputFileName + "...");

          ima.save(outputFileName)
          andThen(outputFileName);
        });
    })
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
        type: "message"
    }));
 }

 function findImages(searching, command) {
    console.log('searching image for :', searching);
    imageClient.search({ 'for': searching, callback : function(err, images) {
        console.log('Found images: ', + JSON.stringify(images));
        command(images)
    }})
 }

