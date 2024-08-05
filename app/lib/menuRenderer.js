const ipc = require("./ipcRenderer")
const log = require("./logRenderer")

const shared = require("./menuShared")

function handle(id, callback) {
    ipc.listen(shared.ipcMessageId(id), callback)
}

exports.init = () => {
    handle(shared.id.about, () => {
        log.debug('Menu entry "About" called')
        console.debug('Menu entry "About" called')
    })
    handle(shared.id.close, () => {
        log.debug("Closing window...")
        ipc.send(ipc.messages.intern.closeWindow)
    })
}
