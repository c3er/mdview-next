const assert = require("assert")

const common = require("../app/lib/common")

class IpcChannel {
    _targetCallbacks = []
    _sourceAssertionCallbacks = []
    _targetAssertionCallbacks = []
    _invokeTargetCallback = null

    send(event, ...args) {
        this._targetCallbacks.forEach(callback => callback(event, ...args))
        this._sourceAssertionCallbacks.forEach(callback => callback(event, ...args))
        this._targetAssertionCallbacks.forEach(callback => callback(event, ...args))
    }

    invoke(event, ...args) {
        return new Promise(resolve => resolve(this._invokeTargetCallback(event, ...args)))
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
        session: {
            webRequest: {
                onBeforeRequest() {},
                onBeforeRedirect() {},
            },
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
        handle(message, callback) {
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
        async invoke(message, ...args) {
            return await _ipcToMainChannels.invoke(message, _electronIpcEvent, ...args)
        },
    }

    BrowserWindow = BrowserWindow
    Menu = Menu
}

class HtmlElement {
    innerHTML = ""
    style = {
        paddingTop: "",
    }

    get children() {
        return [this]
    }

    getAttribute() {
        return ""
    }

    getBoundingClientRect() {
        return {
            top: 0,
        }
    }
}

class Document {
    htmlElement

    constructor(htmlElement) {
        this.htmlElement = htmlElement
    }

    getElementsByTagName() {
        return [this.htmlElement]
    }

    querySelector() {
        return this.htmlElement
    }

    getElementById() {
        return this.htmlElement
    }
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
        mainHandle(message, callback) {
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

exports.elements = {
    mainMenu: {
        application: common.isMacOS()
            ? {
                  label: "mdview",
                  sub: {
                      about: {
                          label: "&About",
                      },
                      settings: {
                          label: "&Settings...",
                      },
                  },
              }
            : {},
        file: {
            label: "&File",
            sub: {
                open: {
                    label: "&Open",
                },
                print: {
                    label: "&Print",
                },
                recentFiles: {
                    label: "Recent Files",
                },
                clearRecentFiles: {
                    label: "Clear Recent Files List",
                },
                quit: !common.isMacOS()
                    ? {
                          label: "&Quit",
                      }
                    : {},
            },
        },
        edit: {
            label: "&Edit",
            sub: {
                copy: {
                    label: "Copy",
                },
                find: {
                    label: "&Find...",
                },
                findNext: {
                    label: "Find &next",
                    isEnabled: false,
                },
                findPrevious: {
                    label: "Find &previous",
                    isEnabled: false,
                },
                settings: {
                    label: "&Settings...",
                },
            },
        },
        view: {
            label: "&View",
            sub: {
                back: {
                    label: "&Back",
                    isEnabled: false,
                },
                forward: {
                    label: "&Forward",
                    isEnabled: false,
                },
                refresh: {
                    label: "&Refresh",
                },
                unblock: {
                    label: "&Unblock All External Content",
                },
                rawText: {
                    label: "&View Raw Text",
                },
                toc: {
                    label: "Table Of &Content",
                    sub: {
                        tocApplication: {
                            label: "Show For &All Documents",
                            isChecked: false,
                        },
                        tocDocument: {
                            label: "Show For &This Document",
                            isChecked: false,
                        },
                        forgetDocumentToc: {
                            label: "Forget Document Override",
                            isEnabled: false,
                        },
                    },
                },
                zoom: {
                    label: "&Zoom",
                    sub: {
                        zoomIn: {
                            label: "Zoom &In",
                        },
                        zoomOut: {
                            label: "Zoom &Out",
                        },
                        resetZoom: {
                            label: "&Reset Zoom",
                        },
                    },
                },
            },
        },
        encoding: {
            label: "En&coding",
            sub: {},
        },
        tools: {
            label: "&Tools",
            sub: {
                developer: {
                    label: "&Developer Tools",
                },
                debug: {
                    label: "De&bug",
                    sub: {
                        throwException: {
                            label: "Throw e&xception",
                        },
                        showError: {
                            label: "Show &error dialog",
                        },
                        softReload: {
                            label: "Soft &reload",
                        },
                    },
                },
            },
        },
        help: !common.isMacOS()
            ? {
                  label: "&Help",
                  sub: {
                      about: {
                          label: "&About",
                      },
                  },
              }
            : {},
    },
}

exports.createDocument = htmlElement => new Document(htmlElement)

exports.createHtmlElement = () => new HtmlElement()
