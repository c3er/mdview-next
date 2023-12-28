const electron = require("electron")

exports.invoke = electron.ipcRenderer.invoke
