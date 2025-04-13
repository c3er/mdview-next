const dialog = require("./dialogRenderer")
const menu = require("./menuRenderer")
const renderer = require("./commonRenderer")

const DIALOG_ID = "search"

const CANCEL_VALUE = "search-dialog-cancel"

const SEARCH_RESULT_CLASS = "search-result"
const SELECTED_SEARCH_RESULT_ID = "selected-search-result"

const RESULT_START_TAG = `<span class="${SEARCH_RESULT_CLASS}">`
const END_TAG = "</span>"

let _document
let _searchDialog
let _searchInputElement
let _reloader

let _isActive = false
let _dialogIsOpen = false
let _term = null
let _searchIndex = 0
let _searchResultCount = 0

// A String.prototype.replaceAll() alternative, that is case insensitive at the input
// ("pattern parameter") but preserves the upper/lower case during replacing.
function replaceAll(text, pattern, replacement) {
    const output = []
    let lastIndex = text.length

    // Based on https://stackoverflow.com/a/1499916 (Remove HTML Tags in Javascript with Regex)
    const tagMatches = [...text.matchAll(/(<([^>]+)>)/g)]

    for (const match of [...text.matchAll(pattern)].reverse()) {
        const term = match[0]
        if (
            tagMatches.some(tagMatch => {
                const tagMatchIndex = tagMatch.index
                const matchIndex = match.index
                return (
                    tagMatchIndex < matchIndex &&
                    tagMatchIndex + tagMatch[0].length > matchIndex + term.length
                )
            })
        ) {
            continue
        }
        output.push(text.substring(match.index + term.length, lastIndex))
        output.push(replacement.replace(new RegExp(term, "i"), term))
        lastIndex = match.index
    }
    output.push(text.substring(0, lastIndex))
    return output.reverse().join("")
}

function reset() {
    _isActive = false
    _dialogIsOpen = false
    _term = null
    _searchIndex = 0
    _searchResultCount = 0
}

function deactivate() {
    reset()
    menu.setEnabled(menu.id.findNext, false)
    menu.setEnabled(menu.id.findPrevious, false)
    _reloader()
}

exports.DIALOG_ID = DIALOG_ID

exports.init = (document, reloader) => {
    _document = document
    _reloader = reloader

    _searchInputElement = _document.getElementById("search-input")
    _searchDialog = _document.getElementById("search-dialog")
    _searchDialog.addEventListener("close", () => {
        _dialogIsOpen = false

        const result = _searchDialog.returnValue
        if (result && result !== CANCEL_VALUE) {
            _term = result
            _reloader()
        } else {
            dialog.close()
        }
    })

    dialog.addStdButtonHandler(_document.getElementById("search-ok-button"), () =>
        _searchDialog.close(_searchInputElement.value),
    )
}

exports.reset = reset

exports.start = () =>
    dialog.open(
        DIALOG_ID,
        () => {
            _searchDialog.showModal()
            _searchInputElement.setSelectionRange(0, _searchInputElement.value.length)
            _isActive = true
            _dialogIsOpen = true

            menu.setEnabled(menu.id.findNext, true)
            menu.setEnabled(menu.id.findPrevious, true)
        },
        deactivate,
    )

exports.next = () => {
    _searchIndex = (_searchIndex + 1) % _searchResultCount
    _reloader()
}

exports.previous = () => {
    _searchIndex = _searchIndex === 0 ? _searchResultCount - 1 : _searchIndex - 1
    _reloader()
}

exports.isActive = () => _isActive

exports.dialogIsOpen = () => _dialogIsOpen

exports.highlightTerm = () => {
    if (!_isActive) {
        return
    }

    const termRegex = new RegExp(_term, "ig")
    const contentElement = renderer.contentElement()
    if (!contentElement.innerText.match(termRegex)) {
        dialog.close()
        return
    }

    contentElement.innerHTML = replaceAll(
        contentElement.innerHTML,
        termRegex,
        RESULT_START_TAG + _term + END_TAG,
    )
    const searchResultElements = _document.getElementsByClassName(SEARCH_RESULT_CLASS)
    _searchResultCount = searchResultElements.length
    for (let i = 0; i < _searchResultCount; i++) {
        const searchResult = searchResultElements[i]
        if (i === _searchIndex) {
            searchResult.setAttribute("id", SELECTED_SEARCH_RESULT_ID)
        } else {
            searchResult.removeAttribute("id")
        }
    }
}

exports.scrollToResult = () => {
    if (!_isActive) {
        return
    }

    const resultElement = _document.getElementById(SELECTED_SEARCH_RESULT_ID)
    const resultElementPosition = renderer.elementYPosition(resultElement)

    const contentElement = renderer.contentElement()
    const scrollPosition = contentElement.scrollTop

    if (
        resultElementPosition < scrollPosition ||
        resultElementPosition + resultElement.clientHeight >
            scrollPosition + contentElement.clientHeight
    ) {
        renderer.scrollTo(resultElementPosition)
    }
}

// For testing

exports.SEARCH_RESULT_CLASS = SEARCH_RESULT_CLASS

exports.SELECTED_SEARCH_RESULT_ID = SELECTED_SEARCH_RESULT_ID

exports.CANCEL_VALUE = CANCEL_VALUE

exports.term = () => _term
