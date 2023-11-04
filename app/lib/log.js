const fs = require("fs/promises")
const path = require("path")

const log = require("electron-log")

const FILENAME = "main.log"

const _debugMessages = []
const _infoMessages = []
const _errorMessages = []

let _logger

function output(storedMessages, outputFunc, args) {
    if (!_logger) {
        storedMessages.push(args)
    } else {
        outputFunc(...args)
    }
}

function dumpPreInitMessages(storedMessages, outputFunc) {
    for (const msg of storedMessages) {
        output(storedMessages, outputFunc, msg)
    }
    storedMessages.length = 0
}

exports.FILENAME = FILENAME

exports.init = async logDir => {
    await fs.mkdir(logDir, { recursive: true })

    log.transports.console.level = false
    log.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}]{scope} [{level}] {text}"
    log.transports.file.resolvePathFn = () => path.join(logDir, FILENAME)

    _logger = log.scope(process.pid.toString())

    dumpPreInitMessages(_debugMessages, _logger.debug)
    dumpPreInitMessages(_infoMessages, _logger.info)
    dumpPreInitMessages(_errorMessages, _logger.error)
}

exports.debug = (...args) => output(_debugMessages, _logger?.debug, args)

exports.info = (...args) => output(_infoMessages, _logger?.info, args)

exports.error = (...args) => output(_errorMessages, _logger?.error, args)
