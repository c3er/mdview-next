const assert = require("assert")
const path = require("path")

const mocking = require("./mocking")

const documentDirectory = path.join(__dirname, "documents")
const mdFilePath = path.join(documentDirectory, "testfile_utf8.md")

describe("Navigation", () => {
    const ipc = require("../app/lib/ipcRenderer")
    const navigation = require("../app/lib/navigationRenderer")

    let htmlElement

    beforeEach(() => {
        htmlElement = mocking.createHtmlElement()
        ipc.init(mocking.electron)
        navigation.init(mocking.electron)
    })

    it("gets events", () => {
        htmlElement.onclick = null
        navigation.registerLink(htmlElement, mdFilePath, documentDirectory)

        assert(htmlElement.onclick !== null)
    })
})
