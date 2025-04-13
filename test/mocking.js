const assert = require("assert")

const common = require("../app/lib/common")

class WebRequestChannel {
    _callback = () => {}

    send(details, callback) {
        this._callback(details, callback)
    }

    register(callback) {
        this._callback = callback
    }
}

class WebRequest {
    _onBeforeRequestChannel = new WebRequestChannel()
    _onBeforeRedirectChannel = new WebRequestChannel()

    sendBeforeRequest(details, callback) {
        this._onBeforeRequestChannel.send(details, callback)
    }

    sendBeforeRedirect(details) {
        this._onBeforeRedirectChannel.send(details)
    }

    registerOnBeforeRequest(callback) {
        this._onBeforeRequestChannel.register(callback)
    }

    registerOnBeforeRedirect(callback) {
        this._onBeforeRedirectChannel.register(callback)
    }
}

class IpcChannel {
    _targetCallbacks = []
    _sourceAssertionCallbacks = []
    _targetAssertionCallbacks = []
    _invokeAssertionCallback = null

    send(event, ...args) {
        this._targetCallbacks.forEach(callback => callback(event, ...args))
        this._sourceAssertionCallbacks.forEach(callback => callback(event, ...args))
        this._targetAssertionCallbacks.forEach(callback => callback(event, ...args))
    }

    invoke(event, ...args) {
        return new Promise((resolve, reject) => {
            const callback = this._invokeAssertionCallback
            if (!callback) {
                reject(new Error("Invoke assertion callback is not set"))
                return
            }
            resolve(callback(event, ...args))
        })
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

    setInvokeAssertion(callback) {
        this._invokeAssertionCallback = callback
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

    setInvokeAssertion(message, callback) {
        this._addCallback(message, callback, channel => channel.setInvokeAssertion(callback))
    }

    send(message, event, ...args) {
        if (!Object.hasOwn(this._data, message)) {
            assert.fail(`Message "${message}" is not registered in channel "${this.name}"`)
        }
        this._data[message].send(event, ...args)
    }

    async invoke(message, event, ...args) {
        if (!Object.hasOwn(this._data, message)) {
            assert.fail(`Message "${message}" is not registered in channel "${this.name}"`)
        }
        return await this._data[message].invoke(event, ...args)
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
    _webRequest

    closeIsCalled = false
    focusIsCalled = false

    constructor(webRequest) {
        this._webRequest = webRequest
    }

    webContents = {
        send(message, ...args) {
            _ipcToRendererChannels.send(message, _electronIpcEvent, ...args)
        },
        session: {
            webRequest: {
                onBeforeRequest: this._webRequest?.registerOnBeforeRequest ?? (() => {}),
                onBeforeRedirect: this._webRequest?.registerOnBeforeRedirect ?? (() => {}),
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
    attributes = []
    innerHTML = ""
    innerText = ""
    style = {
        paddingTop: "",
    }
    value = ""

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

    addEventListener() {}

    setAttribute() {}

    setSelectionRange() {}

    showModal() {}

    close() {}

    focus() {}
}

class Event {
    preventDefault() {}
}

class Document {
    htmlElement

    constructor(htmlElement) {
        this.htmlElement = htmlElement
    }

    getElementsByTagName() {
        return [this.htmlElement]
    }

    getElementsByClassName() {
        return [this.htmlElement]
    }

    querySelector() {
        return this.htmlElement
    }

    getElementById() {
        return this.htmlElement
    }
}

class Window {
    getComputedStyle() {
        return {
            height: 0,
        }
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

exports.createWebRequest = () => new WebRequest()

exports.createBrowserWindow = webRequest => new BrowserWindow(webRequest)

exports.createElectron = () => new Electron()

exports.electronIpcEvent = _electronIpcEvent

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
        rendererInvoke(message, callback) {
            _ipcToMainChannels.setInvokeAssertion(message, callback ?? (() => {}))
        },
    },
    sendToMain(message, event, ...args) {
        _ipcToMainChannels.addTargetAssertion(message, () => {})
        _ipcToMainChannels.send(message, event, ...args)
    },
    sendToRenderer(message, event, ...args) {
        _ipcToRendererChannels.addSourceAssertion(message, () => {})
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

exports.createDocument = htmlElement => new Document(htmlElement ?? new HtmlElement())

exports.createHtmlElement = () => new HtmlElement()

exports.createEvent = () => new Event()

exports.createWindow = () => new Window()
