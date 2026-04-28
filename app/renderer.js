const about = require("./lib/aboutRenderer")
const contentBlocking = require("./lib/contentBlockingRenderer")
const dialog = require("./lib/dialogRenderer")
const documentRendering = require("./lib/documentRenderingRenderer")
const error = require("./lib/errorRenderer")
const fileWatcher = require("./lib/fileWatcherRenderer")
const ipc = require("./lib/ipcRenderer")
const log = require("./lib/logRenderer")
const menuHandling = require("./lib/menuHandlingRenderer")
const navigation = require("./lib/navigationRenderer")
const renderer = require("./lib/commonRenderer")
const search = require("./lib/searchRenderer")
const settings = require("./lib/settingsRenderer")
const statusBar = require("./lib/statusBarRenderer")
const storage = require("./lib/storageRenderer")
const title = require("./lib/titleRenderer")

async function domContentLoadedHandler() {
    ipc.init()
    log.debug("Initializing...")
    menuHandling.init()
    renderer.init(document, window)
    statusBar.init(document)
    documentRendering.init(document)
    contentBlocking.init(document, window)
    error.init(document)
    about.init(document)

    await fileWatcher.init()
    const paths = fileWatcher.paths()
    const documentPath = paths.document

    await storage.init(paths)
    await title.init(document, documentPath)
    navigation.init(document, documentPath)
    settings.init(document, window)
    search.init(document, () => documentRendering.render(documentPath))

    navigation.register(location => title.updatePrefix(location.toString()))
    renderer.contentElement().focus()

    // Needed for testing
    document.getElementById("loading-indicator").innerHTML = '<div id="loaded"></div>'
}

function errorHandler(event) {
    try {
        log.error(event.error)
    } catch {
        // Should stay the only case, where any error is swallowed without any handling.
    }
    return false
}

addEventListener("DOMContentLoaded", domContentLoadedHandler)

addEventListener("error", errorHandler)

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
