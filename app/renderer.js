const fs = require("fs/promises")

const documentRendering = require("./lib/renderer/documentRendering")
const ipc = require("./lib/ipcRenderer")
const log = require("./lib/logRenderer")
const menu = require("./lib/menuRenderer")

const UPDATE_INTERVAL_MS = 1000

async function fetchDocumentPath() {
    return await ipc.invoke(ipc.messages.intern.fetchDocumentPath)
}

async function renderDocument(documentPath) {
    document.querySelector("article#content-body").innerHTML = documentRendering.render(
        await fs.readFile(documentPath, { encoding: "utf-8" }),
    )
}

function watchDocument(documentPath) {
    log.debug(`Setup automatic update of document "${documentPath}"...`)
    let lastModificationTime = 0
    setInterval(async () => {
        try {
            const modificationTime = (await fs.stat(documentPath)).mtimeMs
            if (lastModificationTime === 0) {
                lastModificationTime = modificationTime
            }
            if (modificationTime !== lastModificationTime) {
                log.debug(`Reloading "${documentPath}"...`)
                lastModificationTime = modificationTime
                await renderDocument(documentPath)
            }
        } catch (err) {
            log.error(`Error at watching "${documentPath}": ${err}`)
        }
    }, UPDATE_INTERVAL_MS)
}

async function domContentLoadedHandler() {
    const documentPath = await fetchDocumentPath()
    log.debug(`Got path: ${documentPath}`)
    await renderDocument(documentPath)
    log.info("Rendered document")
    watchDocument(documentPath)
}

ipc.init()
log.debug("Initializing...")
menu.init()
documentRendering.reset()

addEventListener("DOMContentLoaded", domContentLoadedHandler)
