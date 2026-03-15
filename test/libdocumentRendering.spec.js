const assert = require("assert")

const lib = require("./testLib")
const mocking = require("./mocking")

const documentRendering = require("../app/lib/documentRenderingRenderer")
const ipc = require("../app/lib/ipcRenderer")

describe("Document rendering", () => {
    let htmlElement

    beforeEach(() => {
        mocking.cleanup()
        lib.registerElectronLogIpc()
        ipc.init(mocking.createElectron())

        htmlElement = mocking.createHtmlElement()
        documentRendering.init(mocking.createDocument(htmlElement))
    })

    it("renders a header", async () => {
        await documentRendering.render(lib.DEFAULT_DOCUMENT_PATH)
        assert(htmlElement.innerHTML)
        assert(/<h1.*>Test file<\/h1>/.test(htmlElement.innerHTML))
    })
})
