const fs = require("fs/promises")
const path = require("path")

const common = require("./common")
const log = require("./logRenderer")

async function readBytes(filePath, filePosition, numBytesToRead) {
    // Based on https://stackoverflow.com/a/51033457 (Reading data a block at a time, synchronously)
    const buffer = Buffer.alloc(numBytesToRead, 0)
    let fileHandle
    try {
        fileHandle = await fs.open(filePath, "r")
        return await fileHandle.read(buffer, 0, numBytesToRead, filePosition)
    } finally {
        await fileHandle?.close()
    }
}

exports.isMarkdown = filePath =>
    common.FILE_EXTENSIONS.map(ext => `.${ext}`).some(ext => filePath.toLowerCase().endsWith(ext))

exports.isText = async filePath => {
    const SPACE_CHAR = 32
    const LF_CHAR = 10
    const CR_CHAR = 13
    const TAB_CHAR = 9

    const BYTECOUNT = 50000
    let data
    try {
        data = await readBytes(filePath, 0, BYTECOUNT)
    } catch (err) {
        log.error(err.message)
        return false
    }

    // It is not expected that an ASCII file contains control characters.
    // Space character is the first printable ASCII character.
    // Line breaks (LF = 10, CR = 13) and tabs (TAB = 9) are common in text files.
    return data.buffer
        .subarray(0, data.bytesRead - 1)
        .every(byte => byte >= SPACE_CHAR || [LF_CHAR, CR_CHAR, TAB_CHAR].includes(byte))
}

exports.transformRelativePath = (documentDirectory, filePath) =>
    path.join(documentDirectory, filePath).replace("#", "%23")

exports.isAbsolutePath = filePath => Boolean(filePath.match(/^(\S\:)?(\\|\/)/))

exports.exists = async filePath => {
    try {
        await fs.stat(filePath)
        return true
    } catch (err) {
        log.debug(err)
        return false
    }
}
