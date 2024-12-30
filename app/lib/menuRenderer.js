const ipc = require("./ipcRenderer")

const shared = require("./menuShared")

exports.id = shared.id

exports.setEnabled = (id, isEnabled) =>
    ipc.send(ipc.messages.intern.setMenuItemEnabled, id, isEnabled)
