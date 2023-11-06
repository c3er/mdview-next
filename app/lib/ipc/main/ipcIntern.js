const electron = require("electron")

exports.handle = (message, callback) =>
    electron.ipcMain.handle(message, (_, ...args) => callback(...args))
