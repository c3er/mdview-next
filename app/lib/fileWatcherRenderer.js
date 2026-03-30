const ipc = require("./ipcRenderer")
const log = require("./logRenderer")

let documentRendering

let _documentPath

async function fetchDocumentPath() {
    return await ipc.invoke(ipc.messages.intern.fetchDocumentPath)
}

async function dispatchFileChanges(filePaths) {
    log.debug("Updated files:", filePaths)
    for (const filePath of filePaths) {
        if (filePath === _documentPath) {
            log.debug("Handling document:", _documentPath)
            await documentRendering.render(_documentPath)
        }
    }
}

exports.init = async documentRenderingMock => {
    documentRendering = documentRenderingMock ?? require("./documentRenderingRenderer")

    _documentPath = await fetchDocumentPath()
    log.debug(`Got path: ${_documentPath}`)

    await dispatchFileChanges([_documentPath])
    ipc.send(ipc.messages.intern.watchFile, _documentPath)
    ipc.listen(ipc.messages.intern.filesChanged, dispatchFileChanges)
}

exports.documentPath = () => _documentPath
