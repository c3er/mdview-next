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

    static open(filePath) {
        ;(Window.instances[filePath] ?? new Window(filePath)).focus()
    }

    static byFilePath(filePath) {
        const instance = Window.instances[filePath]
        if (!instance) {
            throw new Error(`No window open with file path "${filePath}"`)
        }
        return instance
    }

    static byWebContentsId(id) {
        return Object.values(Window.instances).find(
            window => window._browserWindow.webContents.id === id,
        )
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

exports.open = filePath => {
    filePath ??= _lastOpenedFilePath ?? _defaultFilePath
    Window.open(filePath)
    _lastOpenedFilePath = filePath
}

exports.close = filePath => Window.byFilePath(filePath).close()

exports.pathByWebContentsId = id => {
    const window = Window.byWebContentsId(id)
    if (!window) {
        throw new Error(`No window found for ID ${id}`)
    }
    return window.filePath
}

// For testing

exports.windows = () => Window.instances

exports.lastOpenedFilePath = () => _lastOpenedFilePath

exports.reset = () => Window.reset()
