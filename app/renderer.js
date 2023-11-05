const electron = require("electron")

const ipc = require("./lib/ipc")

const INTERVAL_TIME_MS = 5

const _versions = {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
}

async function loadDocument() {
    return await electron.ipcRenderer.invoke(ipc.windowMessages.loadDocument)
}

function insertText(selector, text) {
    const element = document.getElementById(selector)
    if (element) {
        element.innerText = text
    }
}

window.addEventListener("DOMContentLoaded", () => {
    for (const type of ["chrome", "node", "electron"]) {
        insertText(`${type}-version`, _versions[type])
    }
    const intervalId = setInterval(async () => {
        const doc = await loadDocument()
        if (doc) {
            insertText("file-path", doc)
            clearInterval(intervalId)
        } else {
            insertText("file-path", "Not loaded yet")
        }
    }, INTERVAL_TIME_MS)
})
