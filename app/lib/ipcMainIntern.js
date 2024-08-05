let electron

const _preInitIpcListeners = []

function listen(messageId, callback) {
    if (electron) {
        electron.ipcMain.on(messageId, (event, ...args) => callback(event.sender.id, ...args))
    } else {
        _preInitIpcListeners.push({
            messageId: messageId,
            callback: callback,
        })
    }
}

exports.messages = require("./ipcMessages")

exports.init = electronMock => {
    electron = electronMock ?? require("electron")

    for (const listener of _preInitIpcListeners) {
        listen(listener.messageId, listener.callback)
    }
    _preInitIpcListeners.length = 0
}

exports.listen = listen

exports.handle = (message, callback) =>
    electron.ipcMain.handle(message, (event, ...args) => callback(event.sender.id, ...args))

exports.send = (window, message, ...args) => window.webContents.send(message, ...args)
