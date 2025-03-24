const assert = require("assert")

const mocking = require("./mocking")

const common = require("../app/lib/common")
const ipc = require("../app/lib/ipcRenderer")

describe("Title", () => {
    const title = require("../app/lib/titleRenderer")

    const expectedPrefix = "prefix"
    let document

    beforeEach(async () => {
        mocking.ipc.register.rendererInvoke(ipc.messages.intern.fetchApplicationVersion)
        document = mocking.createDocument()
        await title.init(document, expectedPrefix)
    })

    it("contains the prefix given at initialization", () => {
        assert(document.title.includes(expectedPrefix))
    })

    it("contains the application name", () => {
        assert(document.title.includes(common.APPLICATION_NAME))
    })

    it("updates the prefix", () => {
        const expectedNewPrefix = "something new"
        title.updatePrefix(expectedNewPrefix)
        assert(document.title.includes(expectedNewPrefix))
    })
})
