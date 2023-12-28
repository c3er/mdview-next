const fs = require("fs/promises")

const documentRendering = require("./lib/renderer/documentRendering")
const ipc = require("./lib/ipcRenderer")
const ipcMessages = require("./lib/ipcMessages")

let _domIsLoaded = false

async function fetchDocumentPath() {
    return await ipc.invoke(ipcMessages.intern.fetchDocumentPath)
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

        const documentPath = await fetchDocumentPath()
        if (!documentPath) {
            return
        }

        document.getElementById("content-body").innerHTML = documentRendering.render(
            await fs.readFile(documentPath, { encoding: "utf-8" }),
        )
        clearInterval(intervalId)
    }, FIRST_LOAD_INTERVAL_TIME_MS)
})()
