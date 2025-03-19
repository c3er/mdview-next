const assert = require("assert")

const lib = require("./testLib")
const mocking = require("./mocking")

describe("Content blocking", () => {
    const expectedUrl = "http://example.com"

    describe("Main part", () => {
        const contentBlocking = require("../app/lib/contentBlockingMain")
        const ipc = require("../app/lib/ipcMainIntern")

        beforeEach(() => {
            mocking.cleanup()
            contentBlocking.reset()
            ipc.init(mocking.createElectron())
        })

        it("blocks a URL", () => {
            assert(contentBlocking.isBlocked(expectedUrl))
        })

        it("unblocks a URL", () => {
            contentBlocking.unblock(expectedUrl)
            assert(!contentBlocking.isBlocked(expectedUrl))
        })

        describe("Setup", () => {
            describe("Request handler", () => {
                let webRequestMock
                let browserWindowMock

                function buildRequestCallback(isBlocked) {
                    return options => assert.strictEqual(options.cancel, isBlocked)
                }

                beforeEach(() => {
                    webRequestMock = mocking.createWebRequest()
                    webRequestMock.registerOnBeforeRequest(details =>
                        assert.strictEqual(details.url, expectedUrl),
                    )
                    browserWindowMock = mocking.createBrowserWindow(webRequestMock)
                })

                it("blocks a URL", () => {
                    mocking.ipc.register.webContentsSend(ipc.messages.contentBlocked)
                    contentBlocking.setup(browserWindowMock)
                    webRequestMock.sendBeforeRequest(
                        {
                            url: expectedUrl,
                        },
                        buildRequestCallback(true),
                    )
                })

                it("does not block an unblocked URL", () => {
                    mocking.ipc.sendToMain(
                        ipc.messages.unblockURL,
                        mocking.electronIpcEvent,
                        expectedUrl,
                    )
                    webRequestMock.sendBeforeRequest(
                        {
                            url: expectedUrl,
                        },
                        buildRequestCallback(false),
                    )
                })
            })
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
