const ipc = require("./ipcRenderer")

const shared = require("./logShared")

function output(level, ...args) {
    ipc.send("__ELECTRON_LOG__", {
        scope: shared.scopeString(shared.processType.renderer, process.pid),
        level: level,
        data: args,
    })
}

exports.debug = (...args) => output("debug", ...args)

exports.info = (...args) => output("info", ...args)

exports.error = (...args) => output("error", ...args)
