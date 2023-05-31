const childProcess = require("child_process")
const fs = require("fs")
const path = require("path")

const electron = require("electron")
const ipc = require("@node-ipc/node-ipc").default
const log = require("electron-log")

const cli = require("./lib/cli")

const APPLICATION_DIR = path.join(__dirname, "..")

const WINDOW_WIDTH_DEFAULT = 1024
const WINDOW_HEIGHT_DEFAULT = 768

const IPC_SERVER_ID = "mdview-server"
const IPC_CLIENT_ID = "mdview-client"
const IPC_CONNECTION_ATTEMPTS = 5

let _ipcConnectionAttempts = IPC_CONNECTION_ATTEMPTS
let _logger

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

    childProcess.spawn(processName, args.concat(argv), { detached: true })
    process.exit(0)
}

function initLogger(debugMessages, options) {
    options = Object.assign({}, { logDir: null }, options)

    const logDir = options?.logDir ?? path.join(APPLICATION_DIR, "logs")
    fs.mkdirSync(logDir, { recursive: true })

    log.transports.console = false
    log.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}]{scope} [{level}] {text}"
    log.transports.file.resolvePath = () => path.join(logDir, "main.log")

    const logger = log.scope(process.pid.toString())
    for (const message of debugMessages) {
        logger.debug(...message)
    }
    return logger
}

function initialize(options) {
    options = Object.assign({}, { withIpcConnection: false, asMainProcess: false }, options)

    if (options.withIpcConnection && _ipcConnectionAttempts > 0) {
        _ipcConnectionAttempts--
        return
    }

    _logger.debug("Initializing...")

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

    if (options.withIpcConnection) {
        ipc.serve(() => {
            _logger.debug("Serving...")
            ipc.server.on("app.message", (data, socket) => {
                _logger.debug("Data:", data)
                _logger.debug("Socket:", socket)
            })
        })

        if (options.asMainProcess) {
            ipc.server.start()
            createWindow()
        } else {
            spawnMainProcess(process.argv)
        }
    } else {
        createWindow()
    }
}

function handleConsoleError(err) {
    if (err.code !== "EPIPE") {
        throw new Error(`Could not write to log: ${err}`)
    }
}

electron.app.whenReady().then(() => {
    const [cliArgs, messages] = cli.parse(process.argv)
    _logger = initLogger(messages, { logDir: cliArgs.logDir })
    if (cliArgs.isTest) {
        initialize()
        return
    }

    ipc.config.id = IPC_SERVER_ID
    ipc.config.retry = 5
    ipc.config.maxRetries = IPC_CONNECTION_ATTEMPTS
    ipc.config.silent = true

    ipc.connectTo(IPC_SERVER_ID, () => {
        const connection = ipc.of[IPC_SERVER_ID]
        connection.on("connect", () => {
            _logger.debug("Connected")
            connection.emit("app.message", {
                id: IPC_CLIENT_ID,
                data: "This is a test",
            })
            process.exit(0)
        })
        connection.on("error", err => {
            // _logger.debug("Error:", err)
            if (err.code !== "ENOENT") {
                throw new Error(`Unexpected IPC error occurred: ${err}`)
            }
            initialize({ withIpcConnection: true, asMainProcess: cliArgs.isMainProcess })
        })
        connection.on("app.message", data => {
            _logger.debug("Message:", data)
        })
    })
})

process.stdout.on("error", handleConsoleError)

process.stderr.on("error", handleConsoleError)
