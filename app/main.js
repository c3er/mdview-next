const childProcess = require("child_process")

const electron = require("electron")

const cli = require("./lib/cli")
const ipc = require("./lib/ipc")
const log = require("./lib/log")
const windowManagement = require("./lib/windowManagement")

const IPC_SERVER_ID = "mdview-server"
const IPC_CLIENT_ID = "mdview-client"
const IPC_CONNECTION_ATTEMPTS = 1

let _ipcConnectionAttempts = IPC_CONNECTION_ATTEMPTS
let _fileToOpen = cli.DEFAULT_FILE

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
            windowManagement.open(_fileToOpen)
        }
    })

    electron.ipcMain.handle(ipc.windowMessages.loadDocument, () => _fileToOpen)
}

function initIpc() {
    ipc.node.serve(() => {
        ipc.node.server.on("app.message", message => {
            log.debug("Data:", message)
            if (message.messageId === ipc.messages.openFile) {
                _fileToOpen = message.data
                windowManagement.open(_fileToOpen)
            }
        })
    })
    ipc.node.server.start()
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
    const filePath = cliArgs.filePath

    if (cliArgs.isTest) {
        log.debug("Called in test mode...")
        initElectron()
        windowManagement.open(filePath)
        return
    }

    ipc.node.config.id = IPC_SERVER_ID
    ipc.node.config.retry = 5
    ipc.node.config.maxRetries = IPC_CONNECTION_ATTEMPTS
    ipc.node.config.silent = true

    ipc.node.connectTo(IPC_SERVER_ID, () => {
        const connection = ipc.node.of[IPC_SERVER_ID]

        connection.on("connect", () => {
            log.info("Process already running")

            const message = {
                id: IPC_CLIENT_ID,
                messageId: ipc.messages.openFile,
                data: filePath,
            }
            log.debug("Sending message", message)
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
                _fileToOpen = filePath
                initIpc()
                initElectron()
                windowManagement.open(filePath)
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
