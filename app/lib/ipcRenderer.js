const log = require("./logRenderer")

let electron

const _preInitIpcListeners = []

function listen(messageId, callback) {
    if (electron) {
        electron.ipcRenderer.on(messageId, (_, ...args) => callback(...args))
        log.debug(`Registered IPC message "${messageId}"...`)
    } else {
        log.debug(`Not initialized yet; remembering to listen to "${messageId}"...`)
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

exports.invoke = (message, ...args) => electron.ipcRenderer.invoke(message, ...args)

exports.send = (message, ...args) => electron.ipcRenderer.send(message, ...args)
