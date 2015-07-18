var fn = require('./functions.js')
var nodeImages = require("images");
var fs = require("fs")
var uuid = require('node-uuid')

function parseGuys(guys) {
    if (typeof guys === 'string') {
        guys = guys.split("&").map(function (n) { n.trim() })
    }
    return guys
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

function findAndSendImages(params, then, filtering) {
    if (params.length < 1) {
        then(reply(false, "nada que buscar", null))
    }
    else {
		var searching = params[0];
		fn.findImages(searching, function(images) {
			filtering(images).forEach(function(image) {
				then(reply(true, null, image.url))
			})
		})
    }
}

function reply(success, text, attachment) {
    return {
        success: success,
        text: text,
        attachment: attachment
    }
}

commands = {
    caras: {
        execute: function (params, then) {
            var faces = fs.readdirSync('./faces').map(function (i) { return nodeImages('./faces/' + i) })
            faces.forEach(function(f) { f.resize(80) })

            var height = faces.reduce(function(acc, i) { return acc > i.height() ? acc : i.height() }, 0)
            var width = faces.reduce(function(acc, i) { return acc + i.width() }, 0)

            var image = nodeImages(width, height)
            var x = 0;
            faces.forEach(function(face) {
                image.draw(face, x, (height - face.height())/2)
                x += face.width()
            })

            var name = "./tmp/" + uuid.v4() + ".png"
            image.save(name)

            then(reply(true, 'Caras: {link}', name));
        }
    },
    chau: {
        execute: function (params, then) {
            then(reply(success, "Chau che!"))
        }
    },
    combine: {
        execute: function (params, then) {
            console.log("combine: " + params)
            if (params.length < 1) {
                then(reply(false, "parametros insuficientes", null))
                return
            }
            if (params.length < 2) {
                params = ["soto"].concat(params)
            }
            var guys = parseGuys(params[0])
            var imageUrl = fn.parseUrl(params[1])
            var imageName = params[(params.length > 2) ? 2 : 1]
            var localFile = fn.computeTemporaryImageFileName(imageUrl)
            fn.downloadImage(imageUrl, localFile, function() {
                fn.detectFaces(localFile, function (faces) {
                    processFaces(guys, localFile, faces, function(outputFileName) {
                        fn.deleteFile(localFile)
                        then(reply(true, guys.join(", ") + " en " + imageName, outputFileName))
                    })
                }, function () {
                    fn.deleteFile(localFile)
                    then(reply(false, "no hay caras", null))
                })
            })
        }
    },
    gimage: {
        execute: function (params, then) {
            findAndSendImages(params, then, function (images) { return [images[Math.floor(Math.random()*images.length)]] })
        }
    },
    gimages: {
        execute: function (params, then) {
            findAndSendImages(params, then, function (images) { return images })
        }
    },
    hola: {
        execute: function (params, then) {
            then(reply(success, "Hola che!"))
        }
    },
    names: {
        execute: function (params, then) {
            var names = fs.readdirSync('./faces').map(function(name) {
                return name.substring(0, name.indexOf('.'))
            }).join(', ')
            then(reply(true, "Me banco a " + names, null))
        }
    },
    searchAndCombine: {
        execute: function (params, then) {
            if (params.length < 1) {
                then(reply(false, "parametros insuficientes", null))
                return
            }
            if (params.length < 2) {
                params = ["soto"].concat(params)
            }
            var guys = parseGuys(params[0])
            var imageName = params[1]
            console.log("Combining face for " + guys);
            fn.findImages(imageName, function(images) {
                var next = function(i) {
                    if (i == images.length) {
                        then(reply(false, "no hay caras para " + imageName, null))
                    }
                    else {
                        commands.combine.execute([guys, images[i].url, imageName], function (response) {
                            if (response.success) {
                                then(response)
                            }
                            else {
                                next(i + 1)
                            }
                        })
                    }
                }
                next(0)
            })
        }
    },
}
// aliases
commands.face = {
    execute: commands.searchAndCombine.execute
}

module.exports = commands
