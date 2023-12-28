const electron = require("electron")

exports.messages = require("./ipcMessages")

exports.invoke = electron.ipcRenderer.invoke

exports.send = (message, ...args) => electron.ipcRenderer.send(message, ...args)
