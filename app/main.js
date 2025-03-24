const childProcess = require("child_process")
const fs = require("fs")

const electron = require("electron")

const cli = require("./lib/cliMain")
const ipc = require("./lib/ipcMain")
const log = require("./lib/logMain")
const menu = require("./lib/menuMain")
const windowManagement = require("./lib/windowManagementMain")

let _ipcConnectionAttempts = ipc.extern.CONNECTION_ATTEMPTS
let _isMainProcess = false

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

    // Specific for macOS
    electron.app.on("activate", () => {
        if (electron.BrowserWindow.getAllWindows().length === 0) {
            windowManagement.open()
        }
    })

    ipc.intern.handle(ipc.messages.intern.fetchDocumentPath, id =>
        windowManagement.pathByWebContentsId(id),
    )
    ipc.intern.handle(ipc.messages.intern.fetchApplicationVersion, () => electron.app.getVersion())
}

function initProcessServer() {
    ipc.extern.node.serve(() => {
        ipc.extern.node.server.on("app.message", message => {
            log.debug("Data:", message)
            if (message.messageId === ipc.messages.extern.openFile) {
                windowManagement.open(message.data)
            }
        })
    })
    ipc.extern.node.server.start()
    log.debug("Server started")
}

function handleConsoleError(err) {
    if (err.code !== "EPIPE") {
        throw new Error(`Could not write to log: ${err}`)
    }
}

electron.app.whenReady().then(async () => {
    cli.init()
    const args = process.argv
    log.debug("Unfiltered CLI arguments:", args)
    const cliArgs = cli.parse(
        cli.hideBin(
            args.filter(
                arg => !arg.includes("--remote-debugging-port") && !arg.includes("--inspect"),
            ),
        ),
    )
    _isMainProcess = cliArgs.isMainProcess

    const filePath = cliArgs.filePath

    ipc.init()
    await log.init(cliArgs.logDir, _isMainProcess)
    menu.init()
    windowManagement.init(cli.defaults.filePath)

    if (cliArgs.isTest) {
        log.debug("Called in test mode...")
        initElectron()
        windowManagement.open(filePath)
        return
    }

    ipc.extern.node.connectTo(ipc.extern.SERVER_ID, () => {
        const connection = ipc.extern.node.of[ipc.extern.SERVER_ID]
        log.debug("Path to socket connection:", connection.path)

        connection.on("connect", () => {
            log.info("Process already running")

            const message = {
                id: ipc.extern.CLIENT_ID,
                messageId: ipc.messages.extern.openFile,
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
            } else if (_isMainProcess) {
                log.info("Starting as main process")
                initProcessServer()
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

process.on("exit", code => {
    log.debug(`Stopping with exit code ${code}`)
    if (_isMainProcess) {
        log.debug("Main process stopped")
    }
})

// Based on https://stackoverflow.com/a/50703424/13949398 (custom error window/handling in Electron)
process.on("uncaughtException", error => {
    log.error(`Unhandled error: ${error.stack}`)
    if (!process.argv[0].includes("electron")) {
        electron.dialog.showMessageBoxSync({
            type: "error",
            title: "Unhandled error (fault of Markdown Viewer)",
            message: error.stack,
        })
    }
    electron.app.exit(1)
})
