const electron = require("electron")

const ipc = require("./lib/ipc")

electron.contextBridge.exposeInMainWorld("_versions", {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
})

electron.contextBridge.exposeInMainWorld("_main", {
    async loadDocument() {
        return await electron.ipcRenderer.invoke(ipc.windowMessages.loadDocument)
    },
})
