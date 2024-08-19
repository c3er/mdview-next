const path = require("path")

const hljs = require("highlight.js")

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

function generateCodeText(text, options = {}) {
    options = {
        isHighlighted: false,
        ...options,
    }

    const preClass = options.isHighlighted ? `class="${options.isHighlighted ? "hljs" : ""}"` : ""
    return `<pre ${preClass}><code>${text}</code></pre>`
}

function reset() {
    _markdown = require("markdown-it")({
        highlight(text, language) {
            if (language.toLowerCase() === "mermaid") {
                return `<pre class="mermaid">${text}</pre>`
            }

            // Originated from VS Code
            // File extensions/markdown-language-features/src/markdownEngine.ts
            // Commit ID: 3fbfccad359e278a4fbde106328b2b8e2e2242a7
            if (language && hljs.getLanguage(language)) {
                return generateCodeText(
                    hljs.highlight(text, {
                        language: language,
                        ignoreIllegals: true,
                    }).value,
                    { isHighlighted: true },
                )
            }
            return generateCodeText(_markdown.utils.escapeHtml(text), { isHighlighted: true })
        },
        xhtmlOut: true,
        html: true,
        linkify: true,
        breaks: false, // TODO To be taken from settings
        typographer: true, // TODO To be taken from settings
    })

    _markdown
        .use(require("markdown-it-anchor"), {
            callback(_, info) {
                // toc.addHeader(info.title, info.slug)
                log.debug(info)
            },
        })
        .use(require("markdown-it-html5-embed"), {
            html5embed: {
                attributes: {
                    audio: "controls",
                    video: 'width="500" controls',
                },
            },
        })
        .use(require("markdown-it-multimd-table"), {
            headerless: true,
            multiline: true,
            rowspan: true,
        })
        .use(require("markdown-it-abbr"))
        .use(require("markdown-it-container"), "error")
        .use(require("markdown-it-container"), "info")
        .use(require("markdown-it-container"), "warning")
        .use(require("markdown-it-footnote"))
        .use(require("markdown-it-mark"))
        .use(require("markdown-it-new-katex"))
        .use(require("markdown-it-sub"))
        .use(require("markdown-it-sup"))
        .use(require("markdown-it-task-checkbox"), { disabled: false })

    // TODO Emojis have to be en- or disabled via the settings
    _markdown.use(require("../../../node_modules/markdown-it-emoji/dist/markdown-it-emoji.js"))
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
