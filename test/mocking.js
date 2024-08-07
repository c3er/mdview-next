const assert = require("assert")

class IpcChannel {
    _targetCallbacks = []
    _sourceAssertionCallbacks = []
    _targetAssertionCallbacks = []

    send(event, ...args) {
        this._targetCallbacks.forEach(callback => callback(event, ...args))
        this._sourceAssertionCallbacks.forEach(callback => callback(event, ...args))
        this._targetAssertionCallbacks.forEach(callback => callback(event, ...args))
    }

    addTarget(callback) {
        this._targetCallbacks.push(callback)
    }

    addSourceAssertion(callback) {
        this._sourceAssertionCallbacks.push(callback)
    }

    addTargetAssertion(callback) {
        this._targetAssertionCallbacks.push(callback)
    }
}

class IpcChannelCollection {
    _data = {}

    name = ""

    constructor(name) {
        this.name = name
    }

    addTarget(message, callback) {
        this._addCallback(message, callback, channel => channel.addTarget(callback))
    }

    addSourceAssertion(message, callback) {
        this._addCallback(message, callback, channel => channel.addSourceAssertion(callback))
    }

    addTargetAssertion(message, callback) {
        this._addCallback(message, callback, channel => channel.addTargetAssertion(callback))
    }

    send(message, event, ...args) {
        if (!Object.hasOwn(this._data, message)) {
            assert.fail(`Message "${message}" is not registered in channel "${this.name}"`)
        }
        this._data[message].send(event, ...args)
    }

    clear() {
        this._data = {}
    }

    _addCallback(message, callback, addMethod) {
        if (Object.hasOwn(this._data, message)) {
            addMethod(this._data[message], callback)
        } else {
            const channel = new IpcChannel()
            addMethod(channel, callback)
            this._data[message] = channel
        }
    }
}

class BrowserWindow {
    closeIsCalled = false
    focusIsCalled = false

    webContents = {
        send(message, ...args) {
            _ipcToRendererChannels.send(message, _electronIpcEvent, ...args)
        },
    }

    on() {}

    loadFile() {}

    close() {
        this.closeIsCalled = true
    }

    focus() {
        this.focusIsCalled = true
    }
}

class Menu {
    static buildFromTemplate() {
        return new Menu()
    }
}

class Electron {
    app = {
        getPath() {
            return "/just/a/test/path/"
        },
    }
    ipcMain = {
        on(message, callback) {
            _ipcToMainChannels.addTarget(message, callback)
        },
    }
    ipcRenderer = {
        on(message, callback) {
            _ipcToRendererChannels.addTarget(message, callback)
        },
        send(message, ...args) {
            _ipcToMainChannels.send(message, _electronIpcEvent, ...args)
        },
    }

    BrowserWindow = BrowserWindow
    Menu = Menu
}

const _ipcToMainChannels = new IpcChannelCollection("to-main-channel")
const _ipcToRendererChannels = new IpcChannelCollection("to-renderer-channel")

let _electronIpcEvent = {}

exports.cleanup = () => {
    _electronIpcEvent = {}
    _ipcToMainChannels.clear()
    _ipcToRendererChannels.clear()
}

exports.createElectron = () => new Electron()

exports.ipc = {
    register: {
        mainOn(message, callback) {
            _ipcToMainChannels.addTargetAssertion(message, callback ?? (() => {}))
        },
        rendererOn(message, callback) {
            _ipcToRendererChannels.addTargetAssertion(message, callback ?? (() => {}))
        },
        rendererSend(message, callback) {
            _ipcToMainChannels.addSourceAssertion(message, callback ?? (() => {}))
        },
        webContentsSend(message, callback) {
            _ipcToRendererChannels.addSourceAssertion(message, callback ?? (() => {}))
        },
    },
    sendToMain(message, event, ...args) {
        _ipcToMainChannels.send(message, event, ...args)
    },
    sendToRenderer(message, event, ...args) {
        _ipcToRendererChannels.send(message, event, ...args)
    },
}
