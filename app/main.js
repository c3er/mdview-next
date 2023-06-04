const childProcess = require("child_process")
const path = require("path")

const electron = require("electron")
const ipc = require("@node-ipc/node-ipc").default

const cli = require("./lib/cli")
const log = require("./lib/log")

const WINDOW_WIDTH_DEFAULT = 1024
const WINDOW_HEIGHT_DEFAULT = 768

const IPC_SERVER_ID = "mdview-server"
const IPC_CLIENT_ID = "mdview-client"
const IPC_CONNECTION_ATTEMPTS = 1

let _ipcConnectionAttempts = IPC_CONNECTION_ATTEMPTS

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

function spawnMainProcess(argv) {
    // Determine whether process was started via NPM and prepare accordingly
    const processName = argv[0]
    argv.shift()
    const args = [cli.IS_MAIN_SWITCH]
    if (processName.includes("electron")) {
        argv.shift()
        args.unshift(".")
    }

    const mainProcess = childProcess.spawn(processName, args.concat(argv), { detached: true })
    log.info("Spawned main process with PID", mainProcess.pid)
    mainProcess.unref()
    process.exit(0)
}

function initElectron() {
    electron.app.on("window-all-closed", () => {
        if (process.platform !== "darwin") {
            log.info("Stopping...")
            electron.app.quit()
        }
    })

    electron.app.on("activate", () => {
        // XXX Not tried yet
        if (electron.BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
}

function initIpc() {
    ipc.serve(() => {
        ipc.server.on("app.message", data => {
            log.debug("Data:", data)
        })
    })
    ipc.server.start()
    log.debug("Server started")
}

function handleConsoleError(err) {
    if (err.code !== "EPIPE") {
        throw new Error(`Could not write to log: ${err}`)
    }
}

electron.app.whenReady().then(async () => {
    const cliArgs = cli.parse(process.argv)
    await log.init(cliArgs.logDir)
    if (cliArgs.isTest) {
        log.debug("Called in test mode...")
        initElectron()
        createWindow()
        return
    }

    ipc.config.id = IPC_SERVER_ID
    ipc.config.retry = 5
    ipc.config.maxRetries = IPC_CONNECTION_ATTEMPTS
    ipc.config.silent = true

    ipc.connectTo(IPC_SERVER_ID, () => {
        const connection = ipc.of[IPC_SERVER_ID]

        connection.on("connect", () => {
            log.info("Process already running")

            const message = {
                id: IPC_CLIENT_ID,
                data: "This is a test",
            }
            log.info("Sending message", message)
            connection.emit("app.message", message)

            process.exit(0)
        })

        connection.on("error", err => {
            // log.debug("Error:", err)
            if (err.code !== "ENOENT") {
                throw new Error(`Unexpected IPC error occurred: ${err}`)
            }

            if (_ipcConnectionAttempts > 0) {
                _ipcConnectionAttempts--
            } else if (cliArgs.isMainProcess) {
                log.info("Starting as main process")
                initIpc()
                initElectron()
                createWindow()
            } else {
                log.info("Directly called; starting main process...")
                spawnMainProcess(process.argv)
            }
        })

        connection.on("app.message", data => {
            log.debug("Message:", data)
        })
    })
})

process.stdout.on("error", handleConsoleError)

process.stderr.on("error", handleConsoleError)

process.on("exit", code => log.debug(`Stopping with exit code ${code}`))
