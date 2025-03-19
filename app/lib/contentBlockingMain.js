const common = require("./common")
const ipc = require("./ipcMainIntern")
const log = require("./logMain")

const _unblockedURLs = new Set()

function unblock(url) {
    _unblockedURLs.add(url)
}

function isBlocked(url) {
    return common.isWebURL(url) && !_unblockedURLs.has(url)
}

exports.setup = electronWindow => {
    const webRequest = electronWindow.webContents.session.webRequest
    let lastTime = Date.now()
    webRequest.onBeforeRequest((details, callback) => {
        const currentTime = Date.now()

        const url = details.url
        const urlIsBlocked = isBlocked(url)
        log.info(
            `${isBlocked ? "Blocked" : "Loading"}: ${url} (${currentTime - lastTime} ms since last load)`,
        )
        callback({ cancel: urlIsBlocked })
        if (urlIsBlocked) {
            ipc.send(electronWindow, ipc.messages.intern.contentBlocked, url)
        }

        lastTime = currentTime
    })
    webRequest.onBeforeRedirect(details => {
        const url = details.redirectURL
        log.info(`Redirecting: ${url}`)
        unblock(url)
    })
}

exports.isBlocked = isBlocked

exports.unblock = unblock

// For testing

exports.reset = () => _unblockedURLs.clear()
