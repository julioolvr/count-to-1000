#! /usr/bin/env node

var commands = require('./commands.js')

commands.help.configure("uso command [param1] [param2] ...", function (commandName, description, params, command) {
    return "" + commandName + ": " + description + "\n" + params + "\n"
}, function (paramName, description) {
    return "    " + paramName + " " + description + "\n"
})

var args = process.argv
if (args.length < 3) {
    commands.help.execute([], function(response) {
        console.log("ningún comando. Comandos válidos:\n" + response.text)
    })
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
