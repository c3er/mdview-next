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
            preload: path.join(__dirname, "..", "preload.js"),
            sandbox: false,
        },
    })
    window.on("close", () => delete windows[filePath])
    window.loadFile(path.join(__dirname, "..", "index.html"))
    return window
}

exports.open = filePath => (windows[filePath] = createWindow(filePath))

exports.close = filePath => windows[filePath].close()