const log = require("./logMain")

let electron

const _preInitIpcListeners = []

function listen(messageId, callback) {
    log.debug(`Listening to message "${messageId}", using callback:`, callback)
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
    electron.ipcMain.handle(message, (event, ...args) => {
        const senderId = event.sender.id
        log.debug(`Handling message "${message}" for window ${senderId}; callback:`, callback)
        return callback(senderId, ...args)
    })

exports.send = (browserWindow, message, ...args) => {
    const webContents = browserWindow.webContents
    log.debug(`Sending message "${message}" to window with ID ${webContents.id}; arguments:`, args)
    webContents.send(message, ...args)
}
