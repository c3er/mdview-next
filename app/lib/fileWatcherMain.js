const fs = require("fs/promises")

const ipc = require("./ipcMainIntern")
const log = require("./logMain")
const windowManagement = require("./windowManagementMain")

const UPDATE_INTERVAL_MS = 1000

let _subscriptions
let _setInterval

class Subscription {
    _fsStat

    fileModificationTimes = {}

    constructor(fsStatMock) {
        this._fsStat = fsStatMock ?? fs.stat
    }

    get filePaths() {
        return Object.keys(this.fileModificationTimes)
    }

    async add(filePath) {
        await this._update(filePath)
    }

    async update(filePath) {
        await this._update(filePath)
    }

    async isModified(filePath) {
        return (await this._fsStat(filePath)).mtimeMs !== this.fileModificationTimes[filePath]
    }

    toString() {
        return this.fileModificationTimes.toString()
    }

    async _update(filePath) {
        this.fileModificationTimes[filePath] = (await this._fsStat(filePath)).mtimeMs
    }
}

function unsubscribe(id) {
    log.debug(`Unsubscribe for window ${id}`)
    delete _subscriptions[id]
}

async function subscribe(id, filePath, fsStatMock) {
    log.debug(`Window ${id} subscribed for "${filePath}`)
    if (!_subscriptions[id]) {
        _subscriptions[id] = new Subscription(fsStatMock)
    }
    await _subscriptions[id].add(filePath)
    windowManagement.addEventHandler("close", unsubscribe)
}

function numberObjectPairs(obj) {
    return Object.entries(obj).map(([key, value]) => [Number(key), value])
}

function watchFiles() {
    _setInterval(async () => {
        const toNotify = {}
        for (const [id, subscription] of numberObjectPairs(_subscriptions)) {
            try {
                for (const filePath of subscription.filePaths) {
                    if (!(await subscription.isModified(filePath))) {
                        continue
                    }
                    log.debug(`File "${filePath} changed; subscriber: ${id}`)
                    subscription.update(filePath)
                    if (!toNotify[id]) {
                        toNotify[id] = []
                    }
                    toNotify[id].push(filePath)
                }
            } catch (err) {
                log.error(`Error at watching "${subscription}": ${err}`)
            }
        }
        for (const [id, filePaths] of numberObjectPairs(toNotify)) {
            log.debug(`Notifying ${id} about these files:`, filePaths)
            windowManagement.byWebContentsId(id).send(ipc.messages.intern.filesChanged, filePaths)
        }
    }, UPDATE_INTERVAL_MS)
}

function reset() {
    _subscriptions = {}
}

exports.init = setIntervalMock => {
    reset()
    _setInterval = setIntervalMock ?? setInterval
    ipc.listen(ipc.messages.intern.watchFile, subscribe)
    watchFiles()
}
