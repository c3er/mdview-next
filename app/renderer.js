const fs = require("fs/promises")

const documentRendering = require("./lib/renderer/documentRendering")
const ipc = require("./lib/ipcRenderer")
const log = require("./lib/logRenderer")
const menu = require("./lib/menuRenderer")

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
    ipc.init()
    log.debug("Initializing...")
    menu.init()
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
        log.debug(`Got path: ${documentPath}`)

        document.querySelector("article#content-body").innerHTML = documentRendering.render(
            await fs.readFile(documentPath, { encoding: "utf-8" }),
        )
        log.info(`Rendered document "${documentPath}"`)

        clearInterval(intervalId)
    }, FIRST_LOAD_INTERVAL_TIME_MS)
})()
