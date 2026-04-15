const ipc = require("./ipcRenderer")
const log = require("./logRenderer")

let documentRendering

let _updateBehaviors = []
let _paths

class UpdateBehavior {
    filePath

    shallRenderDocument = false
    shallApplySettings = false
    shallUpdateMenu = false

    constructor(filePath) {
        this.filePath = filePath
    }

    renderDocument() {
        this.shallRenderDocument = true
        return this
    }

    applySettings() {
        this.shallApplySettings = true
        return this
    }

    updateMenu() {
        this.shallUpdateMenu = true
        return this
    }
}

async function dispatchFileUpdates(filePaths) {
    const behaviors = _updateBehaviors.filter(behavior => filePaths.includes(behavior.filePath))

    // TODO Implement missing behaviors...

    if (behaviors.some(behavior => behavior.shallRenderDocument)) {
        const documentPath = _paths.document
        log.debug("Handling document:", documentPath)
        await documentRendering.render(documentPath)
    }
}

function initBehaviors(paths) {
    return [
        new UpdateBehavior(paths.applicationSettings).applySettings().renderDocument(),
        new UpdateBehavior(paths.contentBlocking).renderDocument(),
        new UpdateBehavior(paths.document).renderDocument(),
        new UpdateBehavior(paths.documentSettings).applySettings().renderDocument(),
        new UpdateBehavior(paths.fileHistory).updateMenu(),
    ]
}

exports.init = async documentRenderingMock => {
    documentRendering = documentRenderingMock ?? require("./documentRenderingRenderer")

    _paths = await ipc.invoke(ipc.messages.intern.fetchFilePaths)
    const documentPath = _paths.document
    log.debug(`Got path: ${documentPath}`)

    _updateBehaviors = initBehaviors(_paths)
    await dispatchFileUpdates([documentPath])
    ipc.send(ipc.messages.intern.watchFile, documentPath)
    ipc.listen(ipc.messages.intern.filesChanged, dispatchFileUpdates)
}

exports.documentPath = () => _paths.document
