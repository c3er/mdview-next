const extern = require("./ipcMainExtern")
const intern = require("./ipcMainIntern")

exports.init = electronMock => {
    intern.init(electronMock)

    const ipcNodeConfig = extern.node.config
    ipcNodeConfig.id = extern.SERVER_ID
    ipcNodeConfig.retry = 5
    ipcNodeConfig.maxRetries = extern.CONNECTION_ATTEMPTS
    ipcNodeConfig.silent = true
}

exports.extern = extern

exports.intern = intern

exports.messages = require("./ipcMessages")
