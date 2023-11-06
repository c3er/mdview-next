const childProcess = require("child_process")
const fs = require("fs")

const electron = require("electron")

const cli = require("./lib/cli")
const ipcExtern = require("./lib/ipc/main/ipcExtern")
const ipcIntern = require("./lib/ipc/main/ipcIntern")
const ipcMessages = require("./lib/ipc/ipcMessages")
const log = require("./lib/log")
const windowManagement = require("./lib/windowManagement")

let _ipcConnectionAttempts = ipcExtern.CONNECTION_ATTEMPTS
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

    ipcIntern.handle(ipcMessages.intern.fetchDocumentPath, () => _fileToOpen)
}

function initIpc() {
    ipcExtern.node.serve(() => {
        ipcExtern.node.server.on("app.message", message => {
            log.debug("Data:", message)
            if (message.messageId === ipcMessages.extern.openFile) {
                _fileToOpen = message.data
                windowManagement.open(_fileToOpen)
            }
        })
    })
    ipcExtern.node.server.start()
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

    ipcExtern.node.config.id = ipcExtern.SERVER_ID
    ipcExtern.node.config.retry = 5
    ipcExtern.node.config.maxRetries = ipcExtern.CONNECTION_ATTEMPTS
    ipcExtern.node.config.silent = true

    ipcExtern.node.connectTo(ipcExtern.SERVER_ID, () => {
        const connection = ipcExtern.node.of[ipcExtern.SERVER_ID]
        log.debug("Path to socket connection:", connection.path)

        connection.on("connect", () => {
            log.info("Process already running")

            const message = {
                id: ipcExtern.CLIENT_ID,
                messageId: ipcMessages.extern.openFile,
                data: filePath,
            }
            log.debug("Sending message", message)
            connection.emit("app.message", message)

            process.exit(0)
        })

        connection.on("error", err => {
            if (err.code === "ECONNREFUSED") {
                try {
                    fs.unlinkSync(connection.path)
                } catch (err) {
                    log.warn("Error at cleaning up renmants of previous instance:", err)
                }
            } else if (err.code !== "ENOENT") {
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
