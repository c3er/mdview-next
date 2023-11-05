const path = require("path")

const electron = require("electron")

const WINDOW_WIDTH_DEFAULT = 1024
const WINDOW_HEIGHT_DEFAULT = 768

const windows = {}

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
    window.on("close", () => delete windows[filePath])
    window.loadFile(path.join(__dirname, "..", "index.html"))
    return window
}

exports.open = filePath => {
    const existingWindow = windows[filePath]
    if (!existingWindow) {
        windows[filePath] = createWindow(filePath)
    } else {
        existingWindow.focus()
    }
}

exports.close = filePath => windows[filePath].close()
