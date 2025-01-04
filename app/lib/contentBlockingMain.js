const common = require("./common")

const _unblockedURLs = new Set()

class ContentBlocker {
    _window

    constructor(window) {
        this._window = window
    }

    isBlocked(url) {
        return common.isWebURL(url) && !_unblockedURLs.has(url)
    }

    unblock(url) {
        _unblockedURLs.add(url)
    }
}

exports.create = window => new ContentBlocker(window)
