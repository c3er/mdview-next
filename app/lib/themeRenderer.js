const ipc = require("./ipcRenderer")

exports.fetch = async () => await ipc.invoke(ipc.messages.intern.fetchTheme)

exports.set = theme => ipc.send(ipc.messages.intern.setTheme, theme)
