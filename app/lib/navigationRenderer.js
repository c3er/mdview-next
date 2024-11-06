const fs = require("fs/promises")

const common = require("./common")
const error = require("./errorRenderer")
const file = require("./file")
const ipc = require("./ipcRenderer")
const renderer = require("./commonRenderer")

let electron

let _document

function isInternalLink(url) {
    return url.startsWith("#")
}

async function checkFile(filePath) {
    if (!(await file.exists(filePath))) {
        error.show(`Cannot display: "${filePath}" does not exist`)
        return false
    }
    const fileStat = await fs.stat(filePath)
    if (fileStat.isDirectory()) {
        error.show(`Cannot display: "${filePath}" is a directory`)
        return false
    }
    if (!fileStat.isFile()) {
        error.show(`Cannot display: "${filePath}" is not a valid file`)
        return false
    }
    if (!file.isText(filePath)) {
        error.show(`Cannot display: "${filePath}" is not a text file`)
        return false
    }
    return true
}

function go(target) {
    const targetElement = _document.getElementById(target.replace("#", ""))
    if (!targetElement) {
        error.show(`Link target not found: ${target}`)
        return
    }
    renderer.scrollTo(renderer.elementYPosition(targetElement))
}

async function dispatchLink(target, documentDirectory) {
    target = common.prepareUrl(target)
    const fullPath = file.isAbsolutePath(target)
        ? target
        : file.transformRelativePath(documentDirectory, target)

    if (common.isWebURL(target) || target.startsWith("mailto:")) {
        electron.shell.openExternal(target)
    } else if (isInternalLink(target)) {
        go(target)
    } else if (!file.isMarkdown(fullPath) && !(await file.isText(fullPath))) {
        electron.shell.openPath(fullPath)
    } else if (await checkFile(fullPath)) {
        ipc.send(ipc.messages.intern.openFile, fullPath)
    }
}

exports.init = (document, electronMock) => {
    electron = electronMock ?? require("electron")
    _document = document
}

exports.registerLink = (linkElement, target, documentDirectory) => {
    linkElement.onclick = async event => {
        event.preventDefault()
        await dispatchLink(target, documentDirectory)
    }
}
