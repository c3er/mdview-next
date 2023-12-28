const fs = require("fs/promises")

const documentRendering = require("./lib/renderer/documentRendering")
const ipc = require("./lib/ipcRenderer")
const log = require("./lib/logRenderer")

let _domIsLoaded = false

async function fetchDocumentPath() {
    return await ipc.invoke(ipc.messages.intern.fetchDocumentPath)
}

function domContentLoadedHandler() {
    _domIsLoaded = true
}

addEventListener("DOMContentLoaded", domContentLoadedHandler)

// Before first load
;(() => {
    log.debug("Initializing...")
    documentRendering.reset()

    const FIRST_LOAD_INTERVAL_TIME_MS = 5
    const intervalId = setInterval(async () => {
        log.debug("Waiting for document to load...")

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
        log.info(`Rendered document "${documentPath}"`)

        clearInterval(intervalId)
    }, FIRST_LOAD_INTERVAL_TIME_MS)
})()
