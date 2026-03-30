const assert = require("assert")

const lib = require("./testLib")
const mocking = require("./mocking")

describe("File watcher", () => {
    describe("Renderer part", () => {
        const fileWatcher = require("../app/lib/fileWatcherRenderer")
        const ipc = require("../app/lib/ipcRenderer")

        let documentRendering

        beforeEach(async () => {
            mocking.cleanup()

            ipc.init(mocking.createElectron())
            lib.registerElectronLogIpc()
            mocking.ipc.register.rendererInvoke(
                ipc.messages.intern.fetchDocumentPath,
                () => lib.DEFAULT_DOCUMENT_PATH,
            )
            mocking.ipc.register.mainOn(ipc.messages.intern.watchFile, (_, filePath) =>
                assert.strictEqual(filePath, lib.DEFAULT_DOCUMENT_PATH),
            )

            documentRendering = mocking.createDocumentRendering()
            documentRendering.render = documentPath =>
                assert.strictEqual(documentPath, lib.DEFAULT_DOCUMENT_PATH)

            await fileWatcher.init(documentRendering)
        })

        it("has a document path", () => {
            assert.strictEqual(fileWatcher.documentPath(), lib.DEFAULT_DOCUMENT_PATH)
        })

        it("dispatches file changes", () => {
            let dispatchCallCount = 0
            documentRendering.render = documentPath => {
                assert.strictEqual(documentPath, lib.DEFAULT_DOCUMENT_PATH)
                dispatchCallCount++
            }
            mocking.ipc.sendToRenderer(ipc.messages.intern.filesChanged, {}, [
                lib.DEFAULT_DOCUMENT_PATH,
            ])
            assert.strictEqual(dispatchCallCount, 1)
        })
    })
})
