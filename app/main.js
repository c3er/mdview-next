const path = require("path")

const electron = require("electron")

const WINDOW_WIDTH_DEFAULT = 1024
const WINDOW_HEIGHT_DEFAULT = 768

function createWindow() {
    const mainWindow = new electron.BrowserWindow({
        width: WINDOW_WIDTH_DEFAULT,
        height: WINDOW_HEIGHT_DEFAULT,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
        },
    })
    mainWindow.loadFile(path.join(__dirname, "index.html"))
}

electron.app.whenReady().then(() => {
    createWindow()

    electron.app.on("activate", () => {
        if (electron.BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

electron.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron.app.quit()
    }
})
