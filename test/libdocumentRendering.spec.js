const assert = require("assert")
const path = require("path")

const lib = require("./testLib")
const mocking = require("./mocking")

const documentRendering = require("../app/lib/documentRenderingRenderer")
const ipc = require("../app/lib/ipcRenderer")

describe("Document rendering", () => {
    const standardDocumentPath = path.join(__dirname, "documents", "testfile_utf8.md")

    let htmlElement

    beforeEach(() => {
        mocking.cleanup()
        lib.registerElectronLogIpc()
        ipc.init(mocking.createElectron())

        htmlElement = mocking.createHtmlElement()
        documentRendering.init(mocking.createDocument(htmlElement))
    })

    it("renders a header", async () => {
        await documentRendering.render(standardDocumentPath)
        assert(htmlElement.innerHTML)
        assert(/<h1.*>Test file<\/h1>/.test(htmlElement.innerHTML))
    })
})
