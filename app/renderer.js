const fs = require("fs/promises")

const documentRendering = require("./lib/documentRenderingRenderer")
const ipc = require("./lib/ipcRenderer")
const log = require("./lib/logRenderer")
const menu = require("./lib/menuRenderer")
const statusBar = require("./lib/statusBarRenderer")

const UPDATE_INTERVAL_MS = 1000

async function fetchDocumentPath() {
    return await ipc.invoke(ipc.messages.intern.fetchDocumentPath)
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
                await documentRendering.render(documentPath)
            }
        } catch (err) {
            log.error(`Error at watching "${documentPath}": ${err}`)
        }
    }, UPDATE_INTERVAL_MS)
}

async function domContentLoadedHandler() {
    const documentPath = await fetchDocumentPath()
    log.debug(`Got path: ${documentPath}`)
    await documentRendering.render(documentPath)
    log.info("Rendered document")
    watchDocument(documentPath)
}

ipc.init()
log.debug("Initializing...")
menu.init()
statusBar.init(document)
documentRendering.init(document)

addEventListener("DOMContentLoaded", domContentLoadedHandler)
