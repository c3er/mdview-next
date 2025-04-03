const fs = require("fs/promises")
const path = require("path")

const mocking = require("./mocking")

const ipcMessages = require("../app/lib/ipcMessages")

const DATA_DIR = path.join(__dirname, "data")

exports.DATA_DIR = DATA_DIR

exports.LOG_DIR = path.join(DATA_DIR, "logs")

exports.removeData = async () => await fs.rm(DATA_DIR, { force: true, recursive: true })

exports.registerElectronLogIpc = () => mocking.ipc.register.mainOn("__ELECTRON_LOG__")

exports.registerMenuItemEnabledMessage = () =>
    mocking.ipc.register.rendererSend(ipcMessages.intern.setMenuItemEnabled)
