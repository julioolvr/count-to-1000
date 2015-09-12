var fn = require('./functions.js')
var nodeImages = require("images");
var uuid = require('node-uuid')

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
            var i = 0
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

commands = {
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
}
// aliases
commands.face = {
    help: {
        description: "alias de searchAndCombine"
    },
    execute: commands.searchAndCombine.execute
}

module.exports = commands
