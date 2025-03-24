const fs = require("fs/promises")

const contentBlocking = require("./lib/contentBlockingRenderer")
const documentRendering = require("./lib/documentRenderingRenderer")
const ipc = require("./lib/ipcRenderer")
const log = require("./lib/logRenderer")
const menuHandling = require("./lib/menuHandlingRenderer")
const navigation = require("./lib/navigationRenderer")
const renderer = require("./lib/commonRenderer")
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
    ipc.init()
    log.debug("Initializing...")
    menuHandling.init()
    renderer.init(document)
    statusBar.init(document)
    documentRendering.init(document)
    contentBlocking.init(document, window)

    const documentPath = await fetchDocumentPath()
    log.debug(`Got path: ${documentPath}`)
    navigation.init(document, documentPath)

    await documentRendering.render(documentPath)
    log.info("Rendered document")

    renderer.contentElement().focus()
    watchDocument(documentPath)
}

addEventListener("DOMContentLoaded", domContentLoadedHandler)
