const fs = require("fs/promises")

const about = require("./lib/aboutRenderer")
const contentBlocking = require("./lib/contentBlockingRenderer")
const dialog = require("./lib/dialogRenderer")
const documentRendering = require("./lib/documentRenderingRenderer")
const error = require("./lib/errorRenderer")
const ipc = require("./lib/ipcRenderer")
const log = require("./lib/logRenderer")
const menuHandling = require("./lib/menuHandlingRenderer")
const navigation = require("./lib/navigationRenderer")
const renderer = require("./lib/commonRenderer")
const search = require("./lib/searchRenderer")
const statusBar = require("./lib/statusBarRenderer")
const title = require("./lib/titleRenderer")

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
    error.init(document)
    about.init(document)

    const documentPath = await fetchDocumentPath()
    log.debug(`Got path: ${documentPath}`)

    await title.init(document, documentPath)
    navigation.init(document, documentPath)
    search.init(document, async () => await documentRendering.render(documentPath))
    navigation.register(location => title.updatePrefix(location.toString()))

    await documentRendering.render(documentPath)
    log.info("Rendered document")

    renderer.contentElement().focus()
    watchDocument(documentPath)

    // Needed for testing
    document.getElementById("loading-indicator").innerHTML = '<div id="loaded"></div>'
}

addEventListener("DOMContentLoaded", domContentLoadedHandler)

onkeydown = event => {
    switch (event.key) {
        case "Escape":
            event.preventDefault()
            if (dialog.isOpen()) {
                dialog.close()
            } else {
                ipc.send(ipc.messages.intern.closeWindow)
            }
            return
        case "Backspace":
            if (!dialog.isOpen()) {
                event.preventDefault()
                navigation.back()
            }
            return
    }
}
