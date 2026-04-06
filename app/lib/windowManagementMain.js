const path = require("path")

const contentBlocking = require("./contentBlockingMain")
const ipc = require("./ipcMainIntern")
const menu = require("./menuMain")

let electron

const WINDOW_WIDTH_DEFAULT = 1024
const WINDOW_HEIGHT_DEFAULT = 768

let _defaultFilePath
let _lastOpenedFilePath

class Window {
    static instances = {}

    static _eventHandlers = {
        close: [],
    }

    _browserWindow

    filePath
    menu

    constructor(filePath) {
        this._browserWindow = this._createBrowserWindow()
        contentBlocking.setup(this._browserWindow)
        this.filePath = filePath
        this.menu = menu.create(this)
        this._storeInstance()
    }

    get id() {
        return this._browserWindow.webContents.id
    }

    // For testing
    set id(value) {
        this._browserWindow.webContents.id = value
    }

    // For testing
    get focusIsCalled() {
        return this._browserWindow.focusIsCalled
    }

    // For testing
    get closeIsCalled() {
        return this._browserWindow.closeIsCalled
    }

    focus() {
        this._browserWindow.focus()
    }

    close() {
        this._fireEvent("close")
        this._browserWindow.close()
        this._deleteInstance()
    }

    send(messageId, ...args) {
        ipc.send(this._browserWindow, messageId, ...args)
    }

    openDevTools() {
        this._browserWindow.webContents.openDevTools()
    }

    setMenuItemEnabled(itemId, isEnabled) {
        this.menu.getMenuItemById(itemId).enabled = isEnabled
    }

    unblock(url) {
        contentBlocking.unblock(url)
        for (const window of Object.values(Window.instances).filter(window => window !== this)) {
            ipc.send(window._browserWindow, ipc.messages.intern.contentUnblocked, url)
        }
    }

    addEventHandler(event, callback) {
        this._checkEvent(event)
        Window._eventHandlers[event].push(callback)
    }

    static open(filePath) {
        const instance = Window.instances[filePath] ?? new Window(filePath)
        instance.focus()
        return instance
    }

    static byFilePath(filePath) {
        const instance = Window.instances[filePath]
        if (!instance) {
            throw new Error(`No window open with file path "${filePath}"`)
        }
        return instance
    }

    static byWebContentsId(id) {
        const idType = typeof id
        if (idType !== "number") {
            throw new Error(`Window ID must be a number; was ${idType}`)
        }
        return Object.values(Window.instances).find(window => window.id === id)
    }

    // For testing
    static reset() {
        Window.instances = {}
    }

    _storeInstance() {
        Window.instances[this.filePath] = this
    }

    _deleteInstance() {
        delete Window.instances[this.filePath]
    }

    _updateMenu() {
        electron.Menu.setApplicationMenu(this.menu)
    }

    _createBrowserWindow() {
        const window = new electron.BrowserWindow({
            width: WINDOW_WIDTH_DEFAULT,
            height: WINDOW_HEIGHT_DEFAULT,
            webPreferences: {
                nodeIntegration: true,
                enableRemoteModule: true,
                contextIsolation: false,
            },
        })
        window.on("close", () => this._deleteInstance())
        window.on("focus", () => this._updateMenu())
        window.loadFile(path.join(__dirname, "..", "index.html"))
        return window
    }

    _fireEvent(event, ...args) {
        this._checkEvent(event)
        for (const handler of Window._eventHandlers[event]) {
            handler(this.id, ...args)
        }
    }

    _checkEvent(event) {
        if (!Window._eventHandlers[event]) {
            throw new Error(`Event "${event}" not supported.`)
        }
    }
}

exports.init = (defaultFile, electronMock) => {
    electron = electronMock ?? require("electron")
    _defaultFilePath = defaultFile

    ipc.listen(ipc.messages.intern.openFile, (_, filePath) => Window.open(filePath))
    ipc.listen(ipc.messages.intern.setMenuItemEnabled, (senderId, menuItemId, isEnabled) =>
        Window.byWebContentsId(senderId).setMenuItemEnabled(menuItemId, isEnabled),
    )
    ipc.listen(ipc.messages.intern.closeWindow, senderId => {
        Window.byWebContentsId(senderId).close()
    })

    ipc.handle(ipc.messages.intern.unblockURL, (senderId, url) =>
        Window.byWebContentsId(senderId).unblock(url),
    )
}

// Parameter "id" is for testing
exports.open = (filePath, id) => {
    filePath ??= _lastOpenedFilePath ?? _defaultFilePath
    const window = Window.open(filePath)

    // Do not assign to "_lastOpenedFilePath" until the window was opened successfully
    _lastOpenedFilePath = filePath

    if (id) {
        window.id = id
    }
}

exports.close = filePath => Window.byFilePath(filePath).close()

exports.pathByWebContentsId = id => {
    const window = Window.byWebContentsId(id)
    if (!window) {
        throw new Error(`No window found for ID ${id}`)
    }
    return window.filePath
}

exports.byWebContentsId = Window.byWebContentsId

exports.addEventHandler = (event, callback) => {
    for (const window of Object.values(Window.instances)) {
        window.addEventHandler(event, callback)
    }
}

// For testing

exports.windows = () => Window.instances

exports.lastOpenedFilePath = () => _lastOpenedFilePath

exports.reset = () => {
    Window.reset()
    _lastOpenedFilePath = null
}
