const electron = require("electron")

exports.handle = (message, callback) =>
    electron.ipcMain.handle(message, (event, ...args) => callback(event.sender.id, ...args))
