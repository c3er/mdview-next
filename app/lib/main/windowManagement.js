const path = require("path")

const ipc = require("../ipcMainIntern")
const menu = require("../menuMain")

let electron

const WINDOW_WIDTH_DEFAULT = 1024
const WINDOW_HEIGHT_DEFAULT = 768

let _defaultFilePath
let _lastOpenedFilePath

class Window {
    static instances = {}

    filePath
    electronWindow
    menu

    constructor(filePath) {
        this.filePath = filePath
        this.electronWindow = this._createElectronWindow()
        this.menu = menu.create(filePath, filePath => Window.instances[filePath])
        this._storeInstance()
    }

    focus() {
        this.electronWindow.focus()
    }

    close() {
        this.electronWindow.close()
        this._deleteInstance()
    }

    send(messageId, ...args) {
        ipc.send(this.electronWindow, messageId, ...args)
    }

    openDevTools() {
        this.electronWindow.webContents.openDevTools()
    }

    static open(filePath) {
        const window = Window.instances[filePath] ?? new Window(filePath)
        window.focus()
    }

    static byFilePath(filePath) {
        const instance = Window.instances[filePath]
        if (!instance) {
            throw new Error(`No window open with file path "${filePath}"`)
        }
        return instance
    }

    static byElectronId(id) {
        return Object.values(Window.instances).find(
            window => window.electronWindow.webContents.id === id,
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

    _getInstance() {
        return Window.instances[this.filePath]
    }

    _updateMenu() {
        electron.Menu.setApplicationMenu(this.menu)
    }

    _createElectronWindow() {
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
        window.loadFile(path.join(__dirname, "..", "..", "index.html"))
        return window
    }
}

exports.init = (defaultFile, electronMock) => {
    electron = electronMock ?? require("electron")
    _defaultFilePath = defaultFile

    ipc.listen(ipc.messages.intern.closeWindow, id => Window.byElectronId(id).close())
}

exports.open = filePath => {
    filePath ??= _lastOpenedFilePath ?? _defaultFilePath
    Window.open(filePath)
    _lastOpenedFilePath = filePath
}

exports.close = filePath => Window.byFilePath(filePath).close()

exports.pathByWindowId = id => {
    const window = Window.byElectronId(id)
    if (!window) {
        throw new Error(`No window found for ID ${id}`)
    }
    return window.filePath
}

// For testing

exports.windows = () => Window.instances

exports.lastOpenedFilePath = () => _lastOpenedFilePath

exports.reset = () => Window.reset()
