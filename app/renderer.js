const INTERVAL_TIME_MS = 5

function insertText(selector, text) {
    const element = document.getElementById(selector)
    if (element) {
        element.innerText = text
    }
}

window.addEventListener("DOMContentLoaded", () => {
    for (const type of ["chrome", "node", "electron"]) {
        // eslint-disable-next-line no-undef
        insertText(`${type}-version`, _versions[type])
    }
    const intervalId = setInterval(async () => {
        // eslint-disable-next-line no-undef
        const doc = await _main.loadDocument()
        if (doc) {
            insertText("file-path", doc)
            clearInterval(intervalId)
        } else {
            insertText("file-path", "Not loaded yet")
        }
    }, INTERVAL_TIME_MS)
})
