var uuid = require('node-uuid')
var cv = require('opencv')
var fs = require('fs');
var http = require('http');
var https = require('https');
imageClient = require('google-images');

var htmlEntities = {
    '&amp;': '&',
    '&gt;': '>',
    '&lt;': '<',
    '&quot;': '"',
    '&#39;': "'"
}

var baseFacesPath = "./faces"
function availableFaceFiles() {
    return fs.readdirSync(baseFacesPath)
}

var names = null
var faces = null

fn = {
    anyFaceForGuy: function (guy) {
        return fn.pickRandom(faces[guy])
    },
    availableNames: function (faceFiles, basePath) {
        if (names && !faceFiles) {
            return names
        }
        if (!faceFiles) {
            faceFiles = availableFaceFiles()
        }
        names = []
        faces = []
        faceFiles.forEach(function(filename) {
            var name = filename.substring(0, filename.indexOf('.'))
            filename = (basePath || baseFacesPath) + "/" + filename
            if (names.indexOf(name) == -1) {
                names.push(name)
                faces[name] = [filename]
            }
            else {
                faces[name].push(filename)
            }
        })
        return names
    },
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
                    if (err || faces.length === 0) {
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
            response.on('end', function () { then(true) })
        }).on('error', function () { then(false) })
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
    htmlDecode: function(text) {
        return text.replace(/(&\w\w?\w?\w?\w?;|&#[0-9]{1,5};)/ig, function (match, capture) {
            return (capture in htmlEntities) ? htmlEntities[capture] : capture.substr(1, 1) === "#" ? String.fromCharCode(parseInt(capture.substr(2), 10)) : capture
        })
    },
    parseGuys: function(guys, names) {
        if (typeof guys === 'string') {
            var tmpGuys = guys.split("&").map(function (n) { return n.trim() })
            var allNames = names || fn.availableNames()
            guys = []
            tmpGuys.forEach(function (guy) {
                if (guy === "all") {
                    guys = guys.concat(fn.randomize(allNames))
                }
                else if (guy === "random") {
                    guys.push(fn.pickRandom(allNames))
                }
                else if (allNames.indexOf(guy) != -1) {
                    guys.push(guy)
                }
            })
        }
        return guys
    },
    parseUrl: function(url) {
        return url.replace(/<(.*)>/g, '$1')
    },
    pickRandom: function(array) {
        return array[Math.floor(Math.random() * array.length)]
    },
    randomize: function(array) {
        var newArray = []
        array.forEach(function (e) {
            var pos = Math.floor(Math.random() * (newArray.length + 1))
            newArray.splice(pos, 0, e)
        })
        return newArray
    },
    splitSlackParams: function(line) {
        return line.split("+").map(function (arg) { return fn.htmlDecode(arg) })
    }
}

module.exports = fn
