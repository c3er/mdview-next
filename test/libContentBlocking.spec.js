const assert = require("assert")

const lib = require("./testLib")
const mocking = require("./mocking")

describe("Content blocking", () => {
    const expectedUrl = "http://example.com"

    describe("Main part", () => {
        const contentBlocking = require("../app/lib/contentBlockingMain")

        beforeEach(() => contentBlocking.reset())

        it("blocks a URL", () => {
            assert(contentBlocking.isBlocked(expectedUrl))
        })

        it("unblocks a URL", () => {
            contentBlocking.unblock(expectedUrl)
            assert(!contentBlocking.isBlocked(expectedUrl))
        })
    })

    describe("Renderer part", () => {
        const ipc = require("../app/lib/ipcRenderer")
        const contentBlocking = require("../app/lib/contentBlockingRenderer")

        beforeEach(() => {
            lib.registerElectronLogIpc()
            mocking.ipc.register.rendererSend(ipc.messages.intern.setMenuItemEnabled)

            ipc.init(mocking.createElectron())
            contentBlocking.init(
                mocking.createDocument(mocking.createHtmlElement()),
                mocking.createWindow(),
                true,
            )
        })

        afterEach(() => {
            mocking.cleanup()
            contentBlocking.reset()
        })

        it("has no blocked elements by default", () => {
            assert(!contentBlocking.hasBlockedElements())
        })

        it("blocks a URL", () => {
            mocking.ipc.register.rendererOn(ipc.messages.intern.contentBlocked, (_, url) =>
                assert.strictEqual(url, expectedUrl),
            )
            mocking.ipc.sendToRenderer(
                ipc.messages.intern.contentBlocked,
                mocking.electronIpcEvent,
                expectedUrl,
            )
            assert(contentBlocking.hasBlockedElements())
        })

        it("has no blocked URL after unblocking all", async () => {
            mocking.ipc.register.rendererOn(ipc.messages.intern.contentBlocked, (_, url) =>
                assert.strictEqual(url, expectedUrl),
            )
            mocking.ipc.register.rendererInvoke(ipc.messages.intern.unblockURL, (_, url) =>
                assert.strictEqual(url, expectedUrl),
            )

            // First, block a URL
            mocking.ipc.sendToRenderer(
                ipc.messages.intern.contentBlocked,
                mocking.electronIpcEvent,
                expectedUrl,
            )

            await contentBlocking.unblockAll()
            assert(!contentBlocking.hasBlockedElements())
        })
    })
})
