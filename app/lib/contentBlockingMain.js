const common = require("./common")

const _unblockedURLs = new Set()

exports.isBlocked = url => common.isWebURL(url) && !_unblockedURLs.has(url)

exports.unblock = url => _unblockedURLs.add(url)

// For testing

exports.reset = () => _unblockedURLs.clear()
