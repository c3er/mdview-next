const path = require("path")

const electron = require("electron")
const ipc = require("@node-ipc/node-ipc").default

const WINDOW_WIDTH_DEFAULT = 1024
const WINDOW_HEIGHT_DEFAULT = 768

const IPC_SERVER_ID = "mdview-server"
const IPC_CLIENT_ID = "mdview-client"
const IPC_CONNECTION_ATTEMPTS = 5

let ipcConnectionAttempts = IPC_CONNECTION_ATTEMPTS

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

function initialize(options) {
    options = Object.assign({}, { withIpcConnection: false }, options)
    if (options.withIpcConnection && ipcConnectionAttempts > 0) {
        ipcConnectionAttempts--
        return
    }

    console.log("Initialized...")

    electron.app.on("window-all-closed", () => {
        if (process.platform !== "darwin") {
            electron.app.quit()
        }
    })

    electron.app.on("activate", () => {
        if (electron.BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })

    ipc.serve(() => {
        console.log("Serving...")
        ipc.server.on("app.message", (data, socket) => {
            console.log("Data:", data)
            console.log("Socket:", socket)
        })
    })

    ipc.server.start()
    createWindow()
}

electron.app.whenReady().then(() => {
    if (process.argv.includes("--test")) {
        initialize({ withIpcConnection: false })
    }

    ipc.config.id = IPC_SERVER_ID
    ipc.config.retry = 5
    ipc.config.maxRetries = IPC_CONNECTION_ATTEMPTS
    ipc.config.silent = true

    ipc.connectTo(IPC_SERVER_ID, () => {
        const connection = ipc.of[IPC_SERVER_ID]
        connection.on("connect", () => {
            console.log("Connected")
            connection.emit("app.message", {
                id: IPC_CLIENT_ID,
                data: "This is a test",
            })
            process.exit(0)
        })
        connection.on("error", err => {
            // console.log("Error:", err)
            if (err.code !== "ENOENT") {
                throw new Error(`Unexpected IPC error occurred: ${err}`)
            }
            initialize({ withIpcConnection: true })
        })
        connection.on("app.message", data => {
            console.log("Message:", data)
        })
    })
})
