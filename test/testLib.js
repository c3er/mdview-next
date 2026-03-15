const fs = require("fs/promises")
const path = require("path")

const mocking = require("./mocking")

const ipcMessages = require("../app/lib/ipcMessages")

const DATA_DIR = path.join(__dirname, "data")

const DEFAULT_DOCUMENT_FILE = "without-mermaid.md"
const DEFAULT_DOCUMENT_DIR = path.join(__dirname, "documents")

exports.DATA_DIR = DATA_DIR

exports.LOG_DIR = path.join(DATA_DIR, "logs")

exports.DEFAULT_DOCUMENT_FILE = DEFAULT_DOCUMENT_FILE

exports.DEFAULT_DOCUMENT_DIR = DEFAULT_DOCUMENT_DIR

exports.DEFAULT_DOCUMENT_PATH = path.join(DEFAULT_DOCUMENT_DIR, DEFAULT_DOCUMENT_FILE)

exports.removeData = async () => await fs.rm(DATA_DIR, { force: true, recursive: true })

exports.registerElectronLogIpc = () => mocking.ipc.register.mainOn("__ELECTRON_LOG__")

exports.registerMenuItemEnabledMessage = () =>
    mocking.ipc.register.rendererSend(ipcMessages.intern.setMenuItemEnabled)
