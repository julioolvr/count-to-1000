var fn = require('./functions.js')
var nodeImages = require("images");
var fs = require('fs');
var uuid = require('node-uuid')
var Canvas = require('canvas')
var Image = Canvas.Image

function processFaces(guys, fileName, faces, andThen) {
    var ima = nodeImages(fileName);
    var usedGuys = []

    var resizeFactor = 0.1
    var i = 0;
    faces.forEach(function(face) {
        var faceImage = nodeImages(fn.anyFaceForGuy(guys[i]))
        var resized = faceImage.size(face.width * (1 + resizeFactor), face.height * (1+resizeFactor))
        ima.draw(resized, face.x - (face.width*resizeFactor/2), face.y - (face.width*resizeFactor/2))
        if (usedGuys.indexOf(guys[i]) == -1) {
            usedGuys.push(guys[i])
        }
        i = ++i % guys.length
    })

    var outputFileName = fileName.substring(0, fileName.lastIndexOf('.')) + "-out" + fileName.substring(fileName.lastIndexOf('.'));
    console.log("Saving temporary image " + outputFileName + "...");

    ima.save(outputFileName)
    andThen(outputFileName, usedGuys);
}

function findAndSendImages(params, then, filtering) {
    if (params.length < 1) {
        then(reply(false, "nada que buscar", null))
    }
    else {
        var searching = params[0];
        fn.findImages(searching, function(images) {
            images = filtering(images)
            if (images.length === 0) {
                then(reply(false, "no hay imágenes para " + searching))
            }
            else {
                then(reply(true, null, images.map(function (image) { return { file: image.url, text: searching } })))
            }
        })
    }
}

function reply(success, text, attachments) {
    return {
        success: success,
        text: text,
        attachments: attachments ? [].concat(attachments) : null
    }
}

function replyAttachment(text, file) {
    return reply(true, null, [{
        file: file,
        text: text
    }])
}

var commands = {
    addFace: {
        private: true,
        help: {
            description: "agrega una cara",
            params: ["guyName", "url"],
            helpParams: {
                "guyName": "el nombre. Hasta el '.' es el alias, el resto variante.",
                "url": "la url de la cara (png)"
            }
        },
        execute: function (params, then) {
            if (params < 2) {
                then(reply(false, "parámetros insuficientes"))
                return
            }
            fn.addFace(params[0], params[1], function (ok) {
                if (ok) {
                    then(reply(true, "Ya podes usar la cara de " + params[0]))
                }
                else {
                    then(reply(false, "No se pudo subir la cara de " + params[0]))
                }
            })
        }
    },
    caras: {
        help: {
            description: "devuelve una imagen con todas las caras."
        },
        execute: function (params, then) {
            var faces = fs.readdirSync(__dirname + '/faces').map(function (i) { return nodeImages(__dirname + '/faces/' + i) })
            faces.forEach(function(f) { f.resize(80) })

            var height = faces.reduce(function(acc, i) { return acc > i.height() ? acc : i.height() }, 0)
            var width = faces.reduce(function(acc, i) { return acc + i.width() }, 0)

            var image = nodeImages(width, height)
            var x = 0;
            faces.forEach(function(face) {
                image.draw(face, x, (height - face.height())/2)
                x += face.width()
            })

            var name = __dirname + "/tmp/" + uuid.v4() + ".png"
            image.save(name)

            then(replyAttachment('Caras: {link}', name));
        }
    },
    chau: {
        help: {
            description: "te devuelve el saludo cuando te vas."
        },
        execute: function (params, then) {
            then(reply(true, "Chau che!"))
        }
    },
    combine: {
        help: {
            description: "combina una url con las caras que encuentre.",
            params: ["guys", "imageName", "url"],
            helpParams: {
                guys: "las caras a usar unidas por '&'. \"all\" usa todas mezcladas, \"random\" una aleatoria (opcional: por omisión \"all\")",
                imageName: "el nombre de la imagen (opcional: por omisión la url)",
                url: "la url de la imagen a usar"
            }
        },
        execute: function (params, then) {
            console.log("combine: " + params)
            if (params.length < 1) {
                then(reply(false, "parametros insuficientes", null))
                return
            }
            if (params.length < 2) {
                params = ["all"].concat(params)
            }
            if (params.length < 3) {
                params.push(params[1])
            }
            var guys = fn.parseGuys(params[0])
            var imageName = params[1]
            var imageUrl = fn.parseUrl(params[2])
            var localFile = fn.computeTemporaryImageFileName(imageUrl)
            fn.downloadImage(imageUrl, localFile, function(success) {
                if (success) {
                    fn.detectFaces(localFile, function (faces) {
                        processFaces(guys, localFile, faces, function(outputFileName, usedGuys) {
                            fn.deleteFile(localFile)
                            then(replyAttachment(usedGuys.join(", ") + " en " + imageName, outputFileName))
                        })
                    }, function () {
                        fn.deleteFile(localFile)
                        then(reply(false, "no hay caras en " + imageName, null))
                    })
                }
                else {
                    then(reply(false, imageUrl + " no es una url válida", null))
                }
            })
        }
    },
    gimage: {
        help: {
            description: "busca una imagen y la devuelve.",
            params: ["search"],
            helpParams: {
                search: "la búsqueda"
            }
        },
        execute: function (params, then) {
            findAndSendImages(params, then, function (images) { return [images[Math.floor(Math.random()*images.length)]] })
        }
    },
    gimages: {
        help: {
            description: "busca imágenes y las devuelve.",
            params: ["search"],
            helpParams: {
                search: "la búsqueda"
            }
        },
        execute: function (params, then) {
            findAndSendImages(params, then, function (images) { return images })
        }
    },
    help: {
        help: {
            description: "muestra esta ayuda",
            params: ["command"],
            helpParams: {
                "command": "el comando que se quiere conocer (opcional)"
            }
        },
        private: true,
        execute: function (_params, then) {
            var helpText = this.useMode + "\n"
            var format = function (name) {
                var command = commands[name]
                var help = command.help
                var description = ""
                var params = ""
                if (help && help.description) {
                    description = help.description
                }
                if (help && help.params) for (var paramIndex in help.params) {
                    var param = help.params[paramIndex]
                    params += this.formatParam(param, help.helpParams[param])
                }
                helpText += this.formatHelp(name, description, params, command)
            }.bind(this)
            if (_params.length < 1 || !commands[_params[0]]) {
                for (var name in commands) {
                    format(name)
                }
            }
            else {
                format(_params[0])
            }
            then(reply(true, helpText))
        },
        configure: function (useMode, formatHelp, formatParam) {
            this.useMode = useMode
            this.formatHelp = formatHelp
            this.formatParam = formatParam
        }
    },
    hola: {
        help: {
            description: "te devuelve el saludo cuando llegás."
        },
        execute: function (params, then) {
            then(reply(true, "Hola che!"))
        }
    },
    names: {
        help: {
            description: "devuelve todos los nombres que se pueden usar."
        },
        execute: function (params, then) {
            then(reply(true, "Me banco a " + fn.availableNames().join(', '), null))
        }
    },
    searchAndCombine: {
        help: {
            description: "busca imágenes y combina una con las caras que encuentre.",
            params: ["guys", "search"],
            helpParams: {
                guys: "las caras a usar unidas por '&'. \"all\" usa todas mezcladas, \"random\" una aleatoria (opcional: por omisión \"all\")",
                search: "la búsqueda"
            }
        },
        execute: function (params, then) {
            if (params.length < 1) {
                then(reply(false, "parametros insuficientes", null))
                return
            }
            if (params.length < 2) {
                params = ["all"].concat(params)
            }
            var guys = fn.parseGuys(params[0])
            var imageName = params[1]
            console.log("Combining face for " + guys);
            fn.findImages(imageName, function(images) {
                images = fn.randomize(images)
                var next = function(i) {
                    if (i == images.length) {
                        then(reply(false, "no hay caras para " + imageName, null))
                    }
                    else {
                        commands.combine.execute([guys, imageName, images[i].url], function (response) {
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
    searchAndCombineWithText: {
        help: {
            description: "busca imágenes, combina una con las caras que encuentre y agrega texto.",
            params: ["guys", "search"],
            helpParams: {
                guys: "las caras a usar unidas por '&'. \"all\" usa todas mezcladas, \"random\" una aleatoria (opcional: por omisión \"all\")",
                search: "la búsqueda"
            }
        },
        execute: function (params, then) {
            if (params.length < 1) {
                then(reply(false, "parametros insuficientes", null))
                return
            }
            var guys = []
            var search = ""
            var position = "bottom"
            var text = ""
            if (params.length == 1) {
                guys = fn.parseGuys("all")
                search = params[0]
            }
            if (params.length == 2) {
                guys = fn.parseGuys(params[0])
                search = params[1]
                if (guys.length === 0) {
                    guys = fn.parseGuys("all")
                    search = params[0]
                    text = params[1]
                }
            }
            if (params.length >= 3) {
                guys = fn.parseGuys(params[0])
                search = params[1]
                if (params.length == 3) {
                    text = params[2]
                }
                else {
                    position = params[2]
                    text = params[3]
                }
            }
            var combineParams = [guys, search]
            var combine = search.indexOf("http") === 0 ? commands.combine : commands.searchAndCombine
            combine.execute(combineParams, function (combineResponse) {
                if (combineResponse.success && text !== "") {
                    var textParams = [position, text, combineResponse.attachments[0].file]
                    commands.text.execute(textParams, function (response) {
                        then(response)
                        fn.deleteFile(combineResponse.attachments[0].file)
                    })
                }
                else {
                    then(combineResponse)
                }
            })
        }
    },
    text: {
        help: {
            description: "agrega texto a una imagen.",
            params: ["position", "text", "image"],
            helpParams: {
                position: "la posición del text (\"top\" arriba, \"bottom\" abajo) (opcional: por omisión \"bottom\")",
                text: "el texto a escribir",
                image: "la url de la imagen a utilizar"
            }
        },
        execute: function (params, then) {
            if (params.length < 2) {
                then(reply(false, "parámetros insuficientes"))
                return
            }
            else if (params.length < 3) {
                params = ["bottom"].concat(params)
            }
            var position = params[0]
            var text = params[1].replace(/\\n/g, "\n")
            var imageUrl = fn.parseUrl(params[2])
            var localFile = fn.computeTemporaryImageFileName("image.jpg")
            var process = function (squid, then) {
                var img = new Image()
                img.src = squid
                var canvas = new Canvas(img.width, img.height)
                var ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0, img.width, img.height)
                var margin = Math.min(img.width, img.height) * 0.05
                var rect = { top: margin, left: margin, right: img.width - margin, bottom: img.height - margin }
                if (position == "top") {
                    rect.bottom = img.height / 2
                }
                else if (position == "bottom") {
                    rect.top = img.height / 2
                }
                fn.drawText(ctx, text, 'Helvetica', rect, position)
                var out = fs.createWriteStream(localFile)
                var stream = canvas.jpegStream({ progressive: true })
                stream.on('data', function(chunk) {
                    out.write(chunk);
                })
                stream.on('end', function() {
                    then(replyAttachment(text, localFile))
                })
            }
            var processFile = function (fileName, then) {
                fs.readFile(fileName, function(err, squid) {
                    if (!err) {
                        process(squid, then)
                    }
                    else {
                        then(reply(false, "no se pudo abrir la imagen"))
                    }
                })
            }
            if (imageUrl.indexOf("http") === 0) {
                var tempFile = fn.computeTemporaryImageFileName(imageUrl)
                fn.downloadImage(imageUrl, tempFile, function (success, bytes) {
                    if (success) {
                        processFile(tempFile, function (response) {
                            then(response)
                            fn.deleteFile(tempFile)
                        })
                    }
                    else {
                        then(reply(false, "no se pudo abrir la imagen"))
                    }
                })
            }
            else {
                processFile(imageUrl, then)
            }
        }
    }
}
// aliases
commands.face = {
    help: {
        description: "alias de searchAndCombineWithText"
    },
    execute: commands.searchAndCombineWithText.execute
}

module.exports = commands
