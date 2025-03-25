const fs = require("fs/promises")

const common = require("./common")
const error = require("./errorRenderer")
const file = require("./file")
const ipc = require("./ipcRenderer")
const log = require("./logRenderer")
const menu = require("./menuRenderer")
const renderer = require("./commonRenderer")

let electron

let _document

const _locations = {
    back: [],
    forward: [],
    current: null,
}
const _callbacks = []

class Location {
    documentPath
    internalTarget
    scrollPosition

    constructor(documentPath, internalTarget = "", scrollPosition = 0) {
        this.documentPath = documentPath
        this.internalTarget = internalTarget
        this.scrollPosition = scrollPosition
    }

    toString() {
        return `${this.documentPath}${this.internalTarget}`
    }
}

function allowBack(isAllowed) {
    menu.setEnabled(menu.id.navigateBack, isAllowed)
}

function allowForward(isAllowed) {
    menu.setEnabled(menu.id.navigateForward, isAllowed)
}

function clearBack() {
    _locations.back.length = 0
    allowBack(false)
}

function clearForward() {
    _locations.forward.length = 0
    allowForward(false)
}

function reset() {
    clearBack()
    clearForward()
    _locations.current = null
    _callbacks.length = 0
}

function canGoBack() {
    return _locations.back.length > 0
}

function canGoForward() {
    return _locations.forward.length > 0
}

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

function navigate(location) {
    log.debug(`Navigating to ${location} (position ${location.scrollPosition})`)
    renderer.scrollTo(location.scrollPosition)
    for (const callback of _callbacks) {
        callback(location)
    }
    _locations.current = location
}

function goStep(canGoCallback, pushDirection, popDirection) {
    if (!canGoCallback()) {
        return
    }

    const oldLocation = _locations.current
    oldLocation.scrollPosition = renderer.currentScrollPosition()
    pushDirection.push(oldLocation)

    allowBack(canGoBack())
    allowForward(canGoForward())
    navigate(popDirection.pop())
}

function go(target) {
    const targetElement = _document.getElementById(target.replace("#", ""))
    if (!targetElement) {
        error.show(`Link target not found: ${target}`)
        return
    }

    const oldLocation = _locations.current
    oldLocation.scrollPosition = renderer.currentScrollPosition()
    _locations.back.push(oldLocation)

    clearForward()
    allowBack(canGoBack())
    navigate(
        new Location(oldLocation.documentPath, target, renderer.elementYPosition(targetElement)),
    )
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

exports.init = (document, documentPath, electronMock) => {
    electron = electronMock ?? require("electron")
    _document = document

    reset()
    allowBack(false)
    allowForward(false)
    _locations.current = new Location(documentPath)
}

exports.registerLink = (linkElement, target, documentDirectory) => {
    linkElement.onclick = async event => {
        event.preventDefault()
        await dispatchLink(target, documentDirectory)
    }
}

exports.back = () => goStep(canGoBack, _locations.forward, _locations.back)

exports.forward = () => goStep(canGoForward, _locations.back, _locations.forward)

exports.register = callback => _callbacks.push(callback)

// For testing

exports.go = go

exports.canGoBack = canGoBack

exports.canGoForward = canGoForward

exports.currentTarget = () => _locations.current?.internalTarget
