const assert = require("assert")

const lib = require("./testLib")
const mocking = require("./mocking")

const DOCUMENT_PATH = "path/to/document"

describe("File watcher", () => {
    describe("Main part", () => {
        const fileWatcher = require("../app/lib/fileWatcherMain")
        const ipc = require("../app/lib/ipcMainIntern")
        const menu = require("../app/lib/menuMain")
        const windowManagment = require("../app/lib/windowManagementMain")

        let intervallCallback
        let changedFiles
        let fileChangeNotificationCount

        async function subscribe(filePath, windowId, fsStatMock) {
            mocking.ipc.sendToMain(
                ipc.messages.intern.watchFile,
                {
                    sender: {
                        id: windowId,
                    },
                },
                filePath,
                fsStatMock,
            )
            await mocking.ipc.waitForListeners()
        }

        beforeEach(() => {
            mocking.cleanup()
            changedFiles = null
            fileChangeNotificationCount = 0

            const electronMock = mocking.createElectron()
            ipc.init(electronMock)
            windowManagment.init(DOCUMENT_PATH, electronMock)
            menu.init(electronMock)
            mocking.ipc.register.rendererOn(ipc.messages.intern.filesChanged, (_, files) => {
                changedFiles = files
                fileChangeNotificationCount++
            })

            fileWatcher.init(callback => (intervallCallback = callback))
        })

        it("does nothing without any subscription", async () => {
            await intervallCallback()

            assert(!changedFiles)
            assert.strictEqual(fileChangeNotificationCount, 0)
        })

        it("notifies about a single file change", async () => {
            const windowId = 1
            windowManagment.open(DOCUMENT_PATH, windowId)
            const fsStatMock = mocking.createFsStat()
            await subscribe(DOCUMENT_PATH, windowId, fsStatMock.executor)

            await intervallCallback()
            assert(!changedFiles)
            assert.strictEqual(fileChangeNotificationCount, 0)

            fsStatMock.mtimeMs++
            await intervallCallback()
            assert.strictEqual(changedFiles.length, 1)
            assert.strictEqual(changedFiles[0], DOCUMENT_PATH)
            assert.strictEqual(fileChangeNotificationCount, 1)
        })
    })

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
                () => DOCUMENT_PATH,
            )
            mocking.ipc.register.mainOn(ipc.messages.intern.watchFile, (_, filePath) =>
                assert.strictEqual(filePath, DOCUMENT_PATH),
            )

            documentRendering = mocking.createDocumentRendering()
            documentRendering.render = documentPath =>
                assert.strictEqual(documentPath, DOCUMENT_PATH)

            await fileWatcher.init(documentRendering)
        })

        it("has a document path", () => {
            assert.strictEqual(fileWatcher.documentPath(), DOCUMENT_PATH)
        })

        it("dispatches file changes", () => {
            let dispatchCallCount = 0
            documentRendering.render = documentPath => {
                assert.strictEqual(documentPath, DOCUMENT_PATH)
                dispatchCallCount++
            }
            mocking.ipc.sendToRenderer(ipc.messages.intern.filesChanged, {}, [DOCUMENT_PATH])
            assert.strictEqual(dispatchCallCount, 1)
        })
    })
})
