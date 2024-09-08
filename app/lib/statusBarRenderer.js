let _document

function update(text) {
    _document.getElementById("status-text").innerText = text
}

function clear() {
    update("")
}

exports.init = document => (_document = document)

exports.update = update

exports.clear = clear

exports.mouseOver = (element, text) => {
    element.onmouseover = () => update(text)
    element.onmouseout = () => clear()
}
