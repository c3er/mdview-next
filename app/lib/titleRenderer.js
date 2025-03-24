const common = require("./common")
const ipc = require("./ipcRenderer")

let _document
let _constantPart

async function fetchApplicationVersion() {
    return await ipc.invoke(ipc.messages.intern.fetchApplicationVersion)
}

function updatePrefix(prefix) {
    _document.title = `${prefix}${_constantPart}`
}

exports.init = async (document, prefix) => {
    _document = document
    _constantPart = ` - ${common.APPLICATION_NAME} ${await fetchApplicationVersion()}`
    updatePrefix(prefix)
}

exports.updatePrefix = updatePrefix
