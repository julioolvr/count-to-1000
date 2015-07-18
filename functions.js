var uuid = require('node-uuid')
var cv = require('opencv')
var fs = require('fs');
var http = require('http');
var https = require('https');
imageClient = require('google-images');

module.exports = {
    computeTemporaryImageFileName: function(originalUrl) {
        var fileExtension = originalUrl.substring(originalUrl.lastIndexOf('.') + 1);
        return "./tmp/" + uuid.v4() + "." + (fileExtension.length > 4 ? "tmp" : fileExtension);
    },
    deleteFile: function(fileName) {
        fs.unlinkSync(fileName)
    },
    detectFaces: function(fileName, withFaces, withoutFaces) {
        cv.readImage(fileName, function(err, im) {
            console.log("Detecting faces in " + fileName);
            if (!err) try {
                im.detectObject(cv.FACE_CASCADE, {}, function(err, faces) {
                    if (err || faces.length == 0) {
                        withoutFaces()
                    }
                    else {
                        withFaces(faces)
                    }
                });
            }
            catch (error) {
                console.log("Error manipulating image " + fileName);
                withoutFaces()
            }
            else {
                withoutFaces()
            }
        })
    },
    downloadImage: function(url, fileName, then) {
        console.log('Downloading ' + url + " to file " + fileName)
        var file = fs.createWriteStream(fileName)
        var client = url.match(/^https.*/) ? https : http
        var request = client.get(url, function(response) {
            response.pipe(file)
            response.on('end', then)
        })
    },
    findImages: function (searching, command) {
        console.log('Searching image for: ', searching);
        imageClient.search({
            'for': searching,
            callback: function(err, images) {
                console.log('Found ' + images.length + ' images');
                command(images)
            }
        })
    },
    parseUrl: function(url) {
        return url.replace(/\<(.*)\>/g, '$1')
    },
    parseGuys: function(guys) {
        if (typeof guys === 'string') {
            guys = guys.split("&").map(function (n) { return n.trim() })
        }
        return guys
    }
}
