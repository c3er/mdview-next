const ipc = require("./ipcRenderer")
const log = require("./logRenderer")

const shared = require("./menuShared")

function handle(id, callback) {
    ipc.listen(shared.ipcMessageId(id), callback)
}

exports.init = () => {
    handle(shared.id.about, () => log.debug('Menu entry "About" called'))
    handle(shared.id.clearFileHistory, () => log.debug('Menu entry "Clear File History" called'))
    handle(shared.id.encodingChange, () => log.debug('Menu entry "Change Encoding" called'))
    handle(shared.id.errorDialog, () => log.debug('Menu entry "Show Error" called'))
    handle(shared.id.find, () => log.debug('Menu entry "Find" called'))
    handle(shared.id.findNext, () => log.debug('Menu entry "Find Next" called'))
    handle(shared.id.findPrevious, () => log.debug('Menu entry "Find Previous" called'))
    handle(shared.id.navigateBack, () => log.debug('Menu entry "Back" called'))
    handle(shared.id.navigateForward, () => log.debug('Menu entry "Forward" called'))
    handle(shared.id.print, () => log.debug('Menu entry "Print" called'))
    handle(shared.id.rawText, () => log.debug('Menu entry "Show Raw Text" called'))
    handle(shared.id.settings, () => log.debug('Menu entry "Settings" called'))
    handle(shared.id.tocForgetDocumentOverride, () =>
        log.debug('Menu entry "TOC -> Forget Document Override" called'),
    )
    handle(shared.id.tocShowForAll, () =>
        log.debug('Menu entry "TOC -> Show For All Documents" called'),
    )
    handle(shared.id.tocShowForThisDocument, () =>
        log.debug('Menu entry "TOC -> Show For This Document" called'),
    )
    handle(shared.id.unblockAll, () =>
        log.debug('Menu entry "Unblock All External Content" called'),
    )
    handle(shared.id.zoomIn, () => log.debug('Menu entry "Zoom In" called'))
    handle(shared.id.zoomOut, () => log.debug('Menu entry "Zoom Out" called'))
    handle(shared.id.zoomReset, () => log.debug('Menu entry "Reset Zoom" called'))
}
