const path = require("path")

const common = require("../common")
const fileLib = require("../file")
const log = require("../logRenderer")
const statusBar = require("./statusBar")

let _markdown
let _document

function alterStyleURLs(documentDirectory, fileContent) {
    const pattern = /url\(["'](?<url>.*?)["']\)/
    let isInStyle = false
    let isInCode = false
    const lines = fileContent.split(/\r?\n/)
    const lineCount = lines.length
    for (let i = 0; i < lineCount; i++) {
        const line = lines[i].trim()
        if (line === "<style>") {
            isInStyle = true
        } else if (line === "</style>") {
            isInStyle = false
        } else if (line.startsWith("```")) {
            isInCode = !isInCode
        }
        if (isInStyle && !isInCode) {
            const url = line.match(pattern)?.groups.url
            if (!url || common.isWebURL(url)) {
                continue
            }
            lines[i] = line.replace(
                pattern,
                `url("${path.join(documentDirectory, url).replace(/\\/g, "/")}")`,
            )
        }
    }
    return lines.join("\n")
}

function alterTags(tagName, handler) {
    for (const element of [..._document.getElementsByTagName(tagName)]) {
        handler(element)
    }
}

function isDataUrl(url) {
    return url.startsWith("data:")
}

function isLocalPath(url) {
    return !common.isWebURL(url) && !isDataUrl(url)
}

function isInContainer(element, containerId) {
    while (element) {
        if (element.id === containerId) {
            return true
        }
        element = element.parentNode
    }
    return false
}

function reset() {
    _markdown = require("markdown-it")({
        xhtmlOut: true,
        html: true,
        linkify: true,
    })
}

exports.init = document => {
    _document = document
    reset()
}

exports.render = async documentPath => {
    const documentDirectory = path.resolve(path.dirname(documentPath))
    _document.querySelector("article#content-body").innerHTML = _markdown.render(
        alterStyleURLs(
            documentDirectory,
            (await fs.readFile(documentPath, { encoding: "utf-8" })).replace(/^\uFEFF/, ""),
        ),
    )

    // Alter local references to be relativ to the document
    alterTags("a", link => {
        const target = link.getAttribute("href")
        if (target) {
            // navigation.registerLink(link, target, documentDirectory)
            // statusOnMouseOver(link, target)
            statusBar.mouseOver(link, target)

            link.onclick = event => {
                event.preventDefault()
                log.debug(
                    `Link left clicked: target "${target}", document directory "${documentDirectory}"`,
                )
            }
            link.onauxclick = event => {
                event.preventDefault()
                if (event.button === 1) {
                    log.debug(
                        `Link middle clicked: target "${target}", document directory "${documentDirectory}"`,
                    )
                }
            }
        }
    })
    alterTags("img", image => {
        const imageUrl = common.prepareUrl(image.getAttribute("src"))
        if (
            isLocalPath(imageUrl) &&
            isInContainer(image, "content-body") &&
            !fileLib.isAbsolutePath(imageUrl)
        ) {
            image.src = fileLib.transformRelativePath(documentDirectory, imageUrl)
        }
        const altText = image.getAttribute("alt")
        statusBar.mouseOver(image, imageUrl ? `${altText} (${imageUrl})` : altText)

        image.onerror = () => (image.style.backgroundColor = "#ffe6cc")
    })
    alterTags("audio", audioElement => {
        const audioUrl = common.prepareUrl(audioElement.getAttribute("src"))
        if (audioUrl && isLocalPath(audioUrl) && !fileLib.isAbsolutePath(audioUrl)) {
            audioElement.src = fileLib.transformRelativePath(documentDirectory, audioUrl)
        }
    })
    alterTags("source", source => {
        const url = common.prepareUrl(source.getAttribute("src"))
        if (isLocalPath(url) && !fileLib.isAbsolutePath(url)) {
            source.src = fileLib.transformRelativePath(documentDirectory, url)
        }
    })
}
