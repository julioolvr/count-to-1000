#! /usr/bin/env node

var commands = require('./commands.js')
var args = process.argv
if (args.length < 3) {
    console.log("ningún comando. Comandos válidos: " + Object.keys(commands).join(", "))
}
else {
    var commandName = args[2]
    var commandArgs = args.slice(3)
    if (commands[commandName]) {
        commands[commandName].execute(commandArgs, function (reply) {
            console.log(reply)
        })
    }
    else {
        console.log("comando inexistente")
    }
}
