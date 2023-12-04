const path = require("path")

let electron

const WINDOW_WIDTH_DEFAULT = 1024
const WINDOW_HEIGHT_DEFAULT = 768

let _windows = {}

let _defaultFilePath
let _lastOpenedFilePath

function createWindow(filePath) {
    const window = new electron.BrowserWindow({
        width: WINDOW_WIDTH_DEFAULT,
        height: WINDOW_HEIGHT_DEFAULT,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            contextIsolation: false,
        },
    })
    window.on("close", () => delete _windows[filePath])
    window.loadFile(path.join(__dirname, "..", "index.html"))
    return window
}

exports.init = (defaultFile, electronMock) => {
    electron = electronMock ?? require("electron")
    _defaultFilePath = defaultFile
}

exports.open = filePath => {
    filePath ??= _lastOpenedFilePath ?? _defaultFilePath
    const existingWindow = _windows[filePath]
    if (!existingWindow) {
        _windows[filePath] = createWindow(filePath)
    } else {
        existingWindow.focus()
    }
    _lastOpenedFilePath = filePath
}

exports.close = filePath => {
    if (!_windows[filePath]) {
        throw new Error(`No window open with file path "${filePath}"`)
    }
    _windows[filePath].close()
    delete _windows[filePath]
}

exports.pathByWindowId = id => {
    for (const [path, window] of Object.entries(_windows)) {
        if (window.webContents.id === id) {
            return path
        }
    }
    throw new Error(`No window found for ID ${id}`)
}

// For testing

exports.windows = () => _windows

exports.lastOpenedFilePath = () => _lastOpenedFilePath

exports.reset = () => (_windows = {})
