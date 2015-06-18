require('./lib/jquery.facedetection.js');
cv = require('opencv');
imageClient = require('google-images');
var Slack = require('node-slack-upload');
fs = require('fs');
path = require('path');
var uuid = require('node-uuid');


var WebSocket = require('ws'),
    apiToken = "", //Api Token from https://api.slack.com/web (Authentication section)
    authUrl = "https://slack.com/api/rtm.start?token=" + apiToken,
    request = require("request"),
    userId = ''; // Id for the user the bot is posting as

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
              combineFace(message, ws, 'soto')
            }
      }    
  });
}

 function face(message, ws) {
    var searching = message.text.substring(message.text.indexOf(':') + 1);
    if (searching.indexOf('+') > 0) {
      guy = searching.substring(0, searching.indexOf('+'))
      searching = searching.substring(searching.indexOf('+') + 1)
    }
    else {
      guy = "soto"
    }
    combineFace(searching, message, ws, guy);
 }

 function combineFace(searching, message, ws, guy) {
    console.log("combining face for " + guy);
    findImages(searching, function(images) {
      filterOne(images).forEach(function (image) {
          cutFaceAndSend(guy, image, message, ws)
        }
      )
    })
 }

 function cutFaceAndSend(guy, image, message, ws) {
    var fileExtension = image.url.substring(image.url.lastIndexOf('.') + 1);
    var fileName = "./tmp/" + uuid.v4() + (fileExtension.length > 4 ? "" : ("." + fileExtension));

    console.log("Writing image to " + fileName);
    image.writeTo(fileName, function() {
      addCircleToFace(guy, fileName, function(outputFileName) {
        console.log("Uploading new image " + outputFileName + " ...");
        slack.uploadFile({
            file: fs.createReadStream(path.join(__dirname, '.', outputFileName)),
            filetype: 'post',
            title: fileName,
            initialComment: "Face for " + message.text,
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

      })
    })
 }
 function addCircleToFace(guy, fileName, andThen) {
    cv.readImage(fileName, function(err, im){
      cv.readImage("./faces/" + guy + ".png", function(err, soto) {
        console.log("Manipulating images ...");

        im.detectObject(cv.FACE_CASCADE, {}, function(err, faces) {
          if (err) {
            console.log("Error detecting faces: " + err);
            throw err;
          }
          var processingIm = im;
          for (var i=0;i < faces.length; i++) {
            var face = faces[i];
            processingIm = processFace(i, im, face, soto);
          }

          var outputFileName = fileName.substring(0, fileName.lastIndexOf('.')) + "-out" + fileName.substring(fileName.lastIndexOf('.'));
          console.log("Saving temporary image " + outputFileName + "...");
          processingIm.save(outputFileName);
          andThen(outputFileName);
        });
    
      });
    })
 }

 function processFace(i, im, face, soto) {
    console.log("Processing face " + i + " at ("
        + face.x 
        + "," + face.y
        + "," + face.width
        + "," + face.height + ")...");

    console.log("Creating soto-layer...");
        
    var FACE_FACTOR = 1.2;
    var OFFSET_FACTOR = 1 - 0.2;
    var roiWidth = Math.round(face.width * FACE_FACTOR);
    var roiHeight = Math.round(face.height * FACE_FACTOR);

    var layer = new cv.Matrix(im.height(), im.width());
    console.log("Creating roi in sotoLayer...");
    var faceRoi = im.roi(face.x, face.y, face.width, face.height);   
    console.log("Copying soto..");
    var copyOfSoto = soto.copy();
    console.log("Resizing soto..");
    copyOfSoto.resize(face.width, face.height);
    console.log("Cloning soto into image roi..");
    
    copyOfSoto.copyTo(faceRoi);

    // layer.copyWithMask(im, new cv.Matrix(im.height(), im.width(), cv.Constants.CV_8UC1));

    // console.log("Merging layers (" + im.width() + "," +im.height() + ") + (" + layer.width() + "," + layer.height() + ")");
    // var result = new cv.Matrix(im.height(), im.width());
    // console.log("into (" + result.width() + "," + result.height() + ")");
    // var a = result.addWeighted(im, 1.0, layer, 1.0);
    // return result;

    return im;
 }

 function gimage(message, ws) {
    findImages(message, ws, filterOne)
 }

 function gimages(message, ws) {
    findImages(message, ws, filterNone)
 }

 function filterOne(images) { return [images[Math.floor(Math.random()*images.length)]] }
 function filterNone(images) { return images }

 function findAndSendImages(message, ws, filtering) {
    var searching = text.substring(message.text.indexOf(':') + 1);
    findImages(searching, function(images) {
      filtering(images).forEach(function(image) {
          sendImage(ws, message, image.url)
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

