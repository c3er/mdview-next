const about = require("./aboutRenderer")
const contentBlocking = require("./contentBlockingRenderer")
const error = require("./errorRenderer")
const ipc = require("./ipcRenderer")
const log = require("./logRenderer")
const navigation = require("./navigationRenderer")
const search = require("./searchRenderer")

const shared = require("./menuShared")

function handle(id, callback) {
    ipc.listen(shared.ipcMessageId(id), callback)
}

exports.init = () => {
    handle(shared.id.about, about.open)
    handle(shared.id.clearFileHistory, () => log.debug('Menu entry "Clear File History" called'))
    handle(shared.id.encodingChange, () => log.debug('Menu entry "Change Encoding" called'))
    handle(shared.id.errorDialog, () => error.show("An error"))
    handle(shared.id.find, () => search.start())
    handle(shared.id.findNext, () => search.next())
    handle(shared.id.findPrevious, () => search.previous())
    handle(shared.id.navigateBack, navigation.back)
    handle(shared.id.navigateForward, navigation.forward)
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
    handle(shared.id.unblockAll, contentBlocking.unblockAll)
    handle(shared.id.zoomIn, () => log.debug('Menu entry "Zoom In" called'))
    handle(shared.id.zoomOut, () => log.debug('Menu entry "Zoom Out" called'))
    handle(shared.id.zoomReset, () => log.debug('Menu entry "Reset Zoom" called'))
}
