const fs = require("fs/promises")

const electron = require("electron")

const documentRendering = require("./lib/documentRendering")
const ipc = require("./lib/ipc")

let _domIsLoaded = false

async function loadDocument() {
    return await electron.ipcRenderer.invoke(ipc.windowMessages.loadDocument)
}

function domContentLoadedHandler() {
    _domIsLoaded = true
}

addEventListener("DOMContentLoaded", domContentLoadedHandler)

// Before first load
;(() => {
    documentRendering.reset()

    const FIRST_LOAD_INTERVAL_TIME_MS = 5
    const intervalId = setInterval(async () => {
        if (!_domIsLoaded) {
            return
        }

        const documentPath = await loadDocument()
        if (!documentPath) {
            return
        }

        document.getElementById("content-body").innerHTML = documentRendering.render(
            await fs.readFile(documentPath, { encoding: "utf-8" }),
        )
        clearInterval(intervalId)
    }, FIRST_LOAD_INTERVAL_TIME_MS)
})()
