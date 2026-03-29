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
const statusBar = require("./lib/statusBarRenderer")
const title = require("./lib/titleRenderer")

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

    await fileWatcher.init()
    const documentPath = fileWatcher.documentPath()

    await title.init(document, documentPath)
    navigation.init(document, documentPath)
    search.init(document, async () => await documentRendering.render(documentPath))
    navigation.register(location => title.updatePrefix(location.toString()))

    renderer.contentElement().focus()

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
