const fs = require("fs/promises")
const path = require("path")

const mocking = require("./mocking")

const ipcMessages = require("../app/lib/ipcMessages")
const storageConstants = require("../app/lib/storageConstants")

const DATA_DIR = path.join(__dirname, "data")

const DEFAULT_DOCUMENT_FILE = "without-mermaid.md"
const DEFAULT_DOCUMENT_DIR = path.join(__dirname, "documents")
const DEFAULT_DOCUMENT_PATH = path.join(DEFAULT_DOCUMENT_DIR, DEFAULT_DOCUMENT_FILE)

exports.DATA_DIR = DATA_DIR

exports.LOG_DIR = path.join(DATA_DIR, "logs")

exports.DEFAULT_DOCUMENT_FILE = DEFAULT_DOCUMENT_FILE

exports.DEFAULT_DOCUMENT_DIR = DEFAULT_DOCUMENT_DIR

exports.DEFAULT_DOCUMENT_PATH = DEFAULT_DOCUMENT_PATH

exports.STORAGE_PATHS = {
    applicationSettings: path.join(DATA_DIR, storageConstants.APPLICATION_SETTINGS_FILE),
    contentBlocking: path.join(DATA_DIR, storageConstants.CONTENT_BLOCKING_FILE),
    document: DEFAULT_DOCUMENT_PATH,
    documentSettings: path.join(DATA_DIR, storageConstants.DOCUMENT_SETTINGS_FILE),
    fileHistory: path.join(DATA_DIR, storageConstants.FILE_HISTORY_FILE),
}

exports.removeData = () => fs.rm(DATA_DIR, { force: true, recursive: true })

exports.registerElectronLogIpc = () => mocking.ipc.register.mainOn("__ELECTRON_LOG__")

exports.registerMenuItemEnabledMessage = () =>
    mocking.ipc.register.rendererSend(ipcMessages.intern.setMenuItemEnabled)
